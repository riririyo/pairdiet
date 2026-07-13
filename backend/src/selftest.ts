import { weightTolerance, eligible, pickMatch, type QUser } from "./matching.ts";
import { penaltyState, progressRate, discountFor } from "./penalty.ts";
let pass=0,fail=0;
function eq(n:string,g:unknown,w:unknown){const a=JSON.stringify(g),b=JSON.stringify(w);if(a===b)pass++;else{fail++;console.error("x "+n+" got "+a+" want "+b);}}
const base=(o:Partial<QUser>):QUser=>Object.assign({id:"x",sex:"f",over18:true,heightCm:165,weightKg:70,cycleTargetKg:2,enqueuedAt:0,blocked:[]},o) as QUser;
const now=1_000_000_000_000;
// tolerance
eq("tol 0h",weightTolerance(0),10);
eq("tol 48h",weightTolerance(48*3600e3),15);
eq("tol 200h cap",weightTolerance(200*3600e3),20);
// eligibility
eq("異性NG",eligible(base({id:"a",sex:"f"}),base({id:"b",sex:"m"}),now),false);
eq("未成年NG",eligible(base({id:"a"}),base({id:"b",over18:false}),now),false);
eq("ブロックNG",eligible(base({id:"a",blocked:["b"]}),base({id:"b"}),now),false);
eq("体重差12はNG(初期tol10)",eligible(base({id:"a",weightKg:70,enqueuedAt:now}),base({id:"b",weightKg:82,enqueuedAt:now}),now),false);
eq("体重差8はOK",eligible(base({id:"a",weightKg:70,enqueuedAt:now}),base({id:"b",weightKg:78,enqueuedAt:now}),now),true);
// pickMatch: choose closest weight
const me=base({id:"me",weightKg:70,heightCm:165,enqueuedAt:now});
const q=[base({id:"far",weightKg:78,enqueuedAt:now}),base({id:"near",weightKg:71,enqueuedAt:now}),base({id:"male",sex:"m",weightKg:70,enqueuedAt:now})];
eq("最も近い体重を選ぶ",pickMatch(me,q,now)?.id,"near");
eq("候補ゼロならnull",pickMatch(me,[base({id:"m2",sex:"m"})],now),null);
// penalty
eq("2日=warning",penaltyState(2),"warning");
eq("3日=last_chance",penaltyState(3),"last_chance");
eq("4日=dissolved",penaltyState(4),"dissolved");
// progress / discount
eq("接近率50%",Math.round(progressRate(70,69,2)*100),50);
eq("達成=無料(1500)",discountFor(1,1500).price,0);
eq("90%→(2000)1000",discountFor(.9,2000).price,1000);
eq("60%→(1500)1050",discountFor(.6,1500).price,1050);
console.log("\n"+(fail?"FAIL":"ALL PASS")+" pass="+pass+" fail="+fail);
if(fail)process.exit(1);
