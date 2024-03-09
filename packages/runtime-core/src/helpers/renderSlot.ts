import { createVNode,Fragment } from "../vnode";
/**
 * 之前的slot数据是放在instance.slots里面（componentSlot.ts）
 * 这里就是渲染的流程，将数据取出来以便渲染
 * @param slots 用来编译<slot/> 
 * @param name 
 * @param props 
 */
export function renderSlot(slots,name:string,props = {}){
    const slot = slots[name];
    if(slot){
        //因为slot是一个返回vnode的函数，所以这里要用createVNode包装一下
        //slot是一个函数，所有就可以把当前组件的一些数据给传出去，这个就是作用域插槽
        const slotContent = slot(props)
        return createVNode(Fragment,{},slotContent)
    }
}