#!/usr/bin/env python3
"""Five immutable weekly picks, validated draw ingestion, archive. Python stdlib."""
import argparse, datetime as dt, json, pathlib, secrets, urllib.request, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'rounds.json'
TZ=dt.timezone(dt.timedelta(hours=9))
BASE_DATE=dt.date(2026,9,26); BASE_ROUND=1243

def upcoming(today):
    days=(5-today.weekday())%7
    saturday=today+dt.timedelta(days=days)
    return BASE_ROUND+(saturday-BASE_DATE).days//7, saturday

def load():
    return json.loads(DATA.read_text(encoding='utf8')) if DATA.exists() else {'rounds':[]}

def save(data):
    DATA.parent.mkdir(exist_ok=True)
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def valid(nums):
    return isinstance(nums,list) and len(nums)==6 and len(set(nums))==6 and all(type(n)==int and 1<=n<=45 for n in nums)

def rank(nums,wins,bonus):
    hits=len(set(nums)&set(wins))
    return (1 if hits==6 else 2 if hits==5 and bonus in nums else 3 if hits==5 else 4 if hits==4 else 5 if hits==3 else None),hits

def generate(today):
    data=load(); number,date=upcoming(today)
    if any(r['round']==number for r in data['rounds']):return False
    # Don't fabricate historical publication: create only for an upcoming draw.
    games=[]
    while len(games)<5:
        nums=sorted(secrets.SystemRandom().sample(range(1,46),6))
        if nums not in games:games.append(nums)
    data['rounds'].append({'round':number,'draw_date':date.isoformat(),'published_at':dt.datetime.now(TZ).isoformat(timespec='seconds'),'games':games,'result':None})
    data['rounds'].sort(key=lambda x:x['round'],reverse=True);save(data);return True

def fetch_official(number):
    url=f'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd={number}'
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; Lotto5Archive/1.0)','Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=14) as res: payload=json.load(res)
    records=payload.get('data',{}).get('list',[])
    if not records:raise ValueError('공식 조회 결과가 비어 있음')
    item=next((x for x in records if int(x.get('ltEpsd',-1))==number),None)
    if not item:raise ValueError('회차 불일치')
    wins=[int(item[f'tm{i}WnNo']) for i in range(1,7)]
    bonus=int(item['bnsWnNo'])
    if not valid(wins) or bonus in wins or not 1<=bonus<=45:raise ValueError('당첨번호 검증 실패')
    return {'numbers':sorted(wins),'bonus':bonus,'source':url,'verified_at':dt.datetime.now(TZ).isoformat(timespec='seconds')}

def apply_result(number,result):
    data=load();entry=next((x for x in data['rounds'] if x['round']==number),None)
    if not entry:raise ValueError('게시한 회차가 없음. 결과를 소급 생성하지 않음')
    if entry['result']:
        if entry['result']['numbers']!=result['numbers'] or entry['result']['bonus']!=result['bonus']:raise ValueError('기존 결과와 충돌: 자동 덮어쓰기 금지')
        return False
    if dt.date.fromisoformat(entry['draw_date'])>dt.datetime.now(TZ).date():raise ValueError('미래 회차 결과 등록 불가')
    result['matches']=[{'game':i+1,'hits':rank(g,result['numbers'],result['bonus'])[1],'rank':rank(g,result['numbers'],result['bonus'])[0]} for i,g in enumerate(entry['games'])]
    entry['result']=result;save(data);return True

def run(today,manual=None):
    data=load(); pending=[r for r in data['rounds'] if not r['result'] and dt.date.fromisoformat(r['draw_date'])<=today]
    for entry in pending:
        # Don't request until 21:00 on draw date
        now=dt.datetime.now(TZ)
        if entry['draw_date']==today.isoformat() and now.hour<21 and not manual:continue
        try:
            result=manual if manual and manual[0]==entry['round'] else fetch_official(entry['round'])
            if result: print('result saved',entry['round'],apply_result(entry['round'],result))
        except Exception as exc:print('result pending',entry['round'],str(exc),file=sys.stderr)
    # Saturday: generate only AFTER 21:00; Sunday onward: generate next round.
    if today.weekday()==5 and dt.datetime.now(TZ).hour<21:return
    if today.weekday()==5:today+=dt.timedelta(days=1)
    print('new round generated',generate(today))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--today',help='YYYY-MM-DD testing');p.add_argument('--manual',nargs=8,metavar=('ROUND','N1','N2','N3','N4','N5','N6','BONUS'),type=int,help='Manually verified official draw')
    a=p.parse_args();today=dt.date.fromisoformat(a.today) if a.today else dt.datetime.now(TZ).date()
    manual=None
    if a.manual:
        number,*values=a.manual; wins=values[:6];bonus=values[6]
        if not valid(wins) or bonus in wins or not 1<=bonus<=45: p.error('Invalid winning numbers')
        manual=(number,{'numbers':sorted(wins),'bonus':bonus,'source':'동행복권 공식 결과 수동 확인','verified_at':dt.datetime.now(TZ).isoformat(timespec='seconds')})
    run(today,manual)
