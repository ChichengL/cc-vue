import { camelize, hyphenate,toHandlerKey } from '@mini-vue/shared'
export function emit(instance,event:string,...rawArgs: any){
    const props = instance.props;
    //取props中定义的事件
    //让事情变的复杂一点如果是烤肉串命名的话，需要转换成  change-page -> changePage
    let handler = props[toHandlerKey(camelize(event))] //驼峰
    if(!handler){
        handler = props[toHandlerKey(hyphenate(event))] //连字符-
    }
    if(handler){
        handler(...rawArgs)//调用事件处理函数
    }
}