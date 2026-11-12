// JSON parsing + validation. Pure functions, no DOM.
export const hash=s=>{let h=5381;for(const c of s)h=((h*33)^c.codePointAt(0))>>>0;return h.toString(36)};
const str=v=>typeof v==='string'&&v.trim().length>0;
export const questionId=(subject,topic,text)=>hash(`${subject.trim().toLowerCase()}|${topic.trim().toLowerCase()}|${text.trim().toLowerCase()}`);
export function validateQuestion(q){
  if(!q||typeof q!=='object'||Array.isArray(q))return['must be an object'];
  const e=[];
  if(q.type!==undefined&&q.type!=='multiple_choice')e.push('"type" must be "multiple_choice"');
  if(!str(q.question))e.push('"question" must be non-empty text');
  if(!Array.isArray(q.choices)||q.choices.length!==4)e.push('"choices" must contain exactly 4 items');
  else if(!q.choices.every(str))e.push('every choice must be non-empty text');
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)e.push('"answer" must be an integer from 0 to 3');
  if(typeof q.explanation!=='string')e.push('"explanation" must be a string');
  if(!['easy','medium','hard'].includes(q.difficulty))e.push('"difficulty" must be "easy", "medium" or "hard"');
  return e;
}
/** Returns {sets:[{subject,topic,label,valid:[],errors:[]}], errors:[]}. Never throws. */
export function parse(text){
  let d;try{d=JSON.parse(text)}catch(e){return{sets:[],errors:['Invalid JSON: '+e.message]}}
  const arr=Array.isArray(d)?d:[d],sets=[],errors=[];
  arr.forEach((s,i)=>{
    const p=arr.length>1?`Set ${i+1}: `:'';
    if(!s||typeof s!=='object'||Array.isArray(s)){errors.push(p+'must be an object with subject, topic and questions');return}
    const set={subject:String(s.subject??'').trim(),topic:String(s.topic??'').trim(),valid:[],errors:[]};
    if(!str(s.subject))set.errors.push('"subject" must be a non-empty string');
    if(!str(s.topic))set.errors.push('"topic" must be a non-empty string');
    if(!Array.isArray(s.questions)||!s.questions.length)set.errors.push('"questions" must be a non-empty array');
    else if(set.errors.length===0)s.questions.forEach((q,j)=>{
      const e=validateQuestion(q);
      if(e.length)set.errors.push(`Question ${j+1}: ${e.join('; ')}`);
      else set.valid.push({id:questionId(set.subject,set.topic,q.question),setKey:`${set.subject}|${set.topic}`,subject:set.subject,topic:set.topic,type:'multiple_choice',question:q.question.trim(),choices:q.choices.map(c=>c.trim()),answer:q.answer,explanation:q.explanation,difficulty:q.difficulty,added:Date.now()});
    });
    set.label=set.subject&&set.topic?`${set.subject} — ${set.topic}`:`Set ${i+1}`;
    sets.push(set);
  });
  return{sets,errors};
}
