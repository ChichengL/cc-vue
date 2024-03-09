import { hasOwn } from "@mini-vue/shared";
const publicPropertiesMap = {
    $el: i=>i.vnode.el,
    $emit: i=>i.emit,
    $slots: i=>i.slots,
    $props:i=>i.props,
}

export const PublicInstanceProxyHandlers = {
    get({_:instance},key){
        //用户访问proxy[key]，先进行匹配，有直接调用function，没有则进行属性访问
        const {setupState,props} = instance;
        if(key[0] !== '$'){
            //说明不是访问的publicAPI，直接进行属性访问
            if(hasOwn(setupState,key)){
                return setupState[key];
            }else if(hasOwn(props,key)){
                return props[key];
            }
        }
        const publicGetter = publicPropertiesMap[key];
        if(publicGetter){
            return publicGetter(instance);
        }
    },
    set({_:instance},key,value){
        //设置只考虑非publicAPI的属性，且不考虑props
        //setupState
        const {setupState} = instance;
        if(hasOwn(setupState,key)){
            setupState[key] = value;
        }
        return true;
    }
}