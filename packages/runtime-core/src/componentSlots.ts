import { ShapeFlags } from '@mini-vue/shared';


export function initSlots(instance: any, children: any){
    const {vnode} = instance

    if(vnode.shapeFlags & ShapeFlags.SLOTS_CHILDREN){//slots有子节点
        normalizeObjectSlots(children, (instance.slots = {}))
    }
}
const normalizeSlotValue = value => Array.isArray(value)? value : [value] //把fn返回的值转化为数组，这样slot就支持多个元素

const normalizeObjectSlots = (children: any, slots: any) => {
    for(const key in children){
        const value = children[key]
        if(typeof value === 'function'){
            slots[key] = props => normalizeSlotValue(value(props))
        }
    }
}