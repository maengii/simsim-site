// Entertainment only. Deterministic per device and Korean calendar date.
const $=id=>document.getElementById(id);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const seedKey='fun-fortune-seed-v1';
let seed;
try{seed=localStorage.getItem(seedKey);if(!seed){seed=Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-');localStorage.setItem(seedKey,seed)}}catch{seed='guest'}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function pick(items,tag){return items[hash(seed+today+tag)%items.length]}
const lead=['오늘 우주는 당신 편입니다. 단, 알람은 예외입니다.','작은 행운이 숨어 있습니다. 아마 냉장고 뒤는 아닐 겁니다.','오늘의 주인공은 당신입니다. 조연은 커피입니다.','의외의 기회가 찾아옵니다. 문 앞 택배일 수도 있습니다.','평범한 하루인 줄 알았는데 웃을 일이 하나 생기겠네요.','당신의 직감이 반짝입니다. 메뉴 고를 때 써 보세요.','오늘은 적당히 뻔뻔해져도 좋겠습니다. 선은 지키면서요.','행운이 천천히 오고 있습니다. 엘리베이터보다 느릴 수 있어요.','예상치 못한 반전이 기다립니다. 점심 반찬부터 확인하세요.','기분 좋은 우연이 생길지도 모릅니다. 기대는 가볍게!'];
const work=['할 일은 하나씩. 동시에 열 개를 하면 창만 열 개입니다.','회의가 길어져도 당신의 퇴근 의지는 꺾이지 않습니다.','오늘의 능력은 집중력보다 적절한 간식에서 나옵니다.','중요한 메시지는 보내기 전 한 번만 더 읽어보세요.','작은 일을 끝내는 순간 큰 만족감이 찾아옵니다.'];
const money=['할인이라는 단어에 마음을 빼앗기지 마세요.','커피 한 잔의 행복과 통장 잔고 사이에서 균형을 잡으세요.','오늘의 절약은 장바구니를 잠깐 닫는 것부터 시작됩니다.','지갑은 조용하지만 마음은 부자가 될 수 있는 날입니다.','소소한 지출은 괜찮아요. 결제 전 가격만 확인하세요.'];
const social=['먼저 건네는 인사가 생각보다 큰 힘을 발휘합니다.','친구에게 웃긴 사진 하나 보내기 좋은 날입니다.','상대방의 말을 끝까지 들으면 의외의 정보를 얻겠네요.','괜히 연락하고 싶은 사람이 있다면 안부를 물어보세요.','혼자 보내는 시간도 꽤 괜찮은 선택입니다.'];
const food=['김치찌개','돈가스','떡볶이','초밥','아이스 아메리카노','붕어빵','칼국수','샌드위치','짜장면','귤'];
const colors=['민트','보라','하늘색','노랑','주황','남색','분홍'];
const score=60+hash(seed+today+'score')%40;
$('date').textContent=today.replaceAll('-','.');
$('reveal').addEventListener('click',()=>{
 $('score').textContent=score+'점';$('lead').textContent=pick(lead,'lead');$('work').textContent=pick(work,'work');$('money').textContent=pick(money,'money');$('social').textContent=pick(social,'social');$('food').textContent=pick(food,'food');$('color').textContent=pick(colors,'color');$('result').hidden=false;$('reveal').textContent='오늘의 운세 다시 보기';$('result').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('share').addEventListener('click',async()=>{const t=`${today} 오늘의 황당 운세 ${score}점\n${$('lead').textContent}\n행운의 음식: ${$('food').textContent}`;try{await navigator.clipboard.writeText(t);$('share').textContent='복사 완료!'}catch{$('share').textContent='복사 불가: 브라우저 권한 확인'}});
