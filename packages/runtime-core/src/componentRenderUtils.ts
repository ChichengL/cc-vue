
export function shouldUpdateComponent(prevVNode,nextVNode){
    const {props:prevProps} = prevVNode;
    const {props:nextProps} = nextVNode;
    if(prevProps === nextProps){
        return false;
        //这里props相等，说明没有变化，不需要更新
    }
    //如果之前没有props，现在有props，需要更新
    if(!prevProps){
        return !!nextProps;
    }
    if(!nextProps){
        return true;
    }
    return hasPropsChanged(prevProps,nextProps);
}

function hasPropsChanged(prevProps,nextProps){
    //依次比较props.key
    const nextKeys = Object.keys(nextProps);
    for(let i = 0; i < nextKeys.length; i++){
        const key = nextKeys[i];
        if(nextProps[key] !== prevProps[key]){
            return true;
        }
    }
    return false;
}