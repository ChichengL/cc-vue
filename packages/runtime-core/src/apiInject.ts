import { getCurrentInstance } from "./component";

export function inject(key,defaultValue){
    const cur = getCurrentInstance();
    if(cur){
        const provides = cur.parent?.provides;//从其父组件上取到provide
        if(key in provides){
            return provides[key]
        }else if(defaultValue){
            if(typeof defaultValue === 'function'){
                return defaultValue();//如果defaultValue是一个函数，则执行它
            }
        }
        return defaultValue
    }
}
export function provide(key,value){
    const cur = getCurrentInstance();
    if(cur){
        let {provides} = cur;
        const parentProvides = cur.parent?.provides
        //当父级 key 和 爷爷级别的 key 重复的时候，对于子组件来讲，需要取最近的父级别组件的值
        //provides 初始化的时候是在createComponent处理
        if(parentProvides === provides){
            provides = cur.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}