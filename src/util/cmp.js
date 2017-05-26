import assert from 'assert';
//
export function cmpVer(a, b) {
  assert(a);
  assert(b);
  // 支持1.0.1_xxxx.js
  const v1 = a.split('_')[0].split('.');
  const v2 = b.split('_')[0].split('.');
  for (let i = 0; i < v1.length || i < v2.length; i++) {
    if ((v1[i] || '0') < (v2[i] || '0')) {
      return -1;
    } else if ((v1[i] || '0') > (v2[i] || '0')) {
      return 1;
    }
  }
  return 0;
}

export function lastChild(array){
  if (!Array.isArray(array)){
    return array;
  }
  if (array.length<=0){
    return null;
  }
  return array[array.length-1];
}
