/*
尽可能还原 Promise 中的每一个 API, 并通过注释的方式描述思路和原理.
*/
// 声明Promis的状态值
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
// 1、Promise是一个对象
// 2、状态只能从 pending -> fulfilled 或 pending -> rejected
class MyPromise {
  //内部执行函数 - 执行器
  constructor(excutor) {
    try {
      excutor(this.resolve, this.reject)
    } catch (error) {
      this.reject(error)
    }
  }
  status = PENDING
  fulfilledData = undefined
  rejectedData = undefined
  fulfilledCallback = []
  rejectedCallback = []

  //改变状态 pending -> fulfilled
  resolve = (fulfilledData) => {
    // 依据2 状态转换只有两种 如果不是pending状态，不执行后续
    // console.log('resolve start', this.status)
    if(this.status !== PENDING) return;
    this.status = FULFILLED
    //保存成功的数据
    this.fulfilledData = fulfilledData
    while(this.fulfilledCallback.length) this.fulfilledCallback.shift()()
  }

  //改变状态 pending -> rejected
  reject = rejectedData => {
    // 依据2 状态转换只有两种 如果不是pending状态，不执行后续
    if(this.status !== PENDING) return;
    this.status = REJECTED
    //保存失败的信息
    this.rejectedData = rejectedData
    while(this.rejectedCallback.length) this.rejectedCallback.shift()()
  }
  /**关于then方法的链式调用
  * 1. 首先then方法要是一个Promise对象
  * 2. 将上一个then方法里面的返回值传递给当前的then方法
  * 3. resolvePromise => 判断then方法返回的值是Promise 还是 普通值
  **/
  then(onFulfilledCallback, onRejectedCallback){
    // console.log('then', this.status)
    //参数可选
    onFulfilledCallback = onFulfilledCallback ? onFulfilledCallback : fulfilledData => fulfilledData
    onRejectedCallback = onRejectedCallback ? onRejectedCallback : error => { throw error }

    let promise = new MyPromise((resolve, reject) => {
      if(this.status === FULFILLED) {
        //promise的获取，使用异步的形式
        setTimeout(() => {
          try {
            let currentThenData = onFulfilledCallback(this.fulfilledData)
            resolvePromise(promise, currentThenData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        }, 0)
      }else if(this.status == REJECTED){
        setTimeout(() => {
          try {
            let currentThenData = onRejectedCallback(this.rejectedData)
            resolvePromise(promise, currentThenData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        }, 0)
      }else{
        //如果当前状态为pending，将 onFulfilledCallback, onRejectedCallback 存储起来
        this.fulfilledCallback.push(() => {
          setTimeout(() => {
            try {
              let currentThenData = onFulfilledCallback(this.fulfilledData)
              resolvePromise(promise, currentThenData, resolve, reject)
            } catch (error) {
              reject(error)
            }
          }, 0)
        })
        this.rejectedCallback.push(() => {
          setTimeout(() => {
            try {
              let currentThenData = onRejectedCallback(this.rejectedData)
              resolvePromise(promise, currentThenData, resolve, reject)
            } catch (error) {
              reject(error)
            }
          }, 0)
        })
      }
    })
    return promise;
  }
  finally(fn){
    return this.then(value => {
      return MyPromise.resolve(fn()).then(() => value)
    }, error => {
      return MyPromise.resolve(fn()).then(() => {throw error})
    })
  }
  catch(fn){
    this.then(undefined, fn)
  }
  static resolve(data){
    if(data instanceof MyPromise) return data
    return MyPromise(resolve => resolve(data))
  }
  // Promise.all() -> static
  static all(array){
    let results = []
    let index = 0
    return new MyPromise((resolve, reject) => {
      function addData(key, value){
        results[key] = value
        index++
        if(index == array.length) {
          resolve(results)
        }
      }
      for(let i = 0; i < array.length; i++){
        let currentData = array[i]
        if(currentData instanceof MyPromise){
          currentData.then(data => {
            addData(i, data)
          }, error => {
            reject(error)
          })
        }else{
          addData(i, currentData)
        }
      }
    })
  }
}

module.exports = MyPromise

function resolvePromise(promise, currentThenData, resolve, reject){
  if(promise === currentThenData) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }
  if(currentThenData instanceof MyPromise){
    currentThenData.then(resolve, reject)
  }else{
    resolve(currentThenData)
  }
}

//demo
let promise1 = () => new MyPromise((resolve, reject) => {
  // throw new Error('执行期错误')
  // setTimeout(() => {
    resolve('1')
  // },1000)
  // reject('失败')
})
let promise2 = () => new MyPromise((resolve, reject) => {
  // setTimeout(() => {
    reject('promise2 error')
    // resolve('2')
  // })
})
// promise1().then().then(data => {
//   // throw new Error('then error')
//   console.log('11', data)
//   return 'aaa'
// }, error => {
//   console.log(error)
//   return 10000
// }).then(data => {
//   console.log('33',data)
// }, error => {
//   console.log(error)
// })
// let p1 = promise1().then(data => {
//   console.log('11',data)
//   return p1
// })
// p1.then(data => {
//   console.log('22',data)
// },error => {
//   console.log(error)
// }).then(data => {
//   console.log('33',data)
// })

// MyPromise.all(['a', 'b', promise1(), promise2(), 'c']).then(results => {
//   console.log(results)
//   return 1000
// })
promise1().finally(data => {
  console.log('finally', data)
  return promise2()
}).then(res => {
  console.log('after finally', res)
})
promise2().then(data => {
  console.log(data)
}).catch(error => {
  console.log('catch', error)
})
