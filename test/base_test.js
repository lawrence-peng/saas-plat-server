import '../src/base';

describe('API', function () {
  it('混入', async function () {
    const Class1 = class extends saasplat.mixins(saasplat.base){

    }

    const c1 = new Class1;
    console.log(c1)
  })

})
