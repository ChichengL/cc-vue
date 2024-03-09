import { ReactiveEffect } from "@mini-vue/reactivity";
import { queuePreFlushCb} from './scheduler'
export function watchEffect(effect){
    return doWatch(effect)
}

function doWatch(source){
    //把job添加到preFlush里面
    //也就是视图更新完成之前进行了渲染(待确定)
    const job = ()=>{
        effect.run()
    };

    //当触发trigger会调用scheduler，其目的是在render前执行，变成一个异步行为
    const scheduler = ()=>queuePreFlushCb(job);

    //cleanup是为了解决初始化的时候不调用fn（用户穿过来的cleanup）
    let cleanup;
    //第一次执行watchEffect的时候onCleanup会被调用，这里将fn赋值给cleanup
    //第二次执行watchEffect就需要执行fn，也就是cleanup
    const onCleanup = (fn) =>{
        cleanup = effect.onStop = () => {
            fn();
          };
    };
    //这里时在执行effect.run的时候就会调用
    const getter = ()=>{
        if(cleanup){
            cleanup()
        }
        source(onCleanup)
    }
    const effect = new ReactiveEffect(getter,scheduler)
    effect.run()
    //这里执行的getter
    return ()=>{
        effect.stop()
    }
}