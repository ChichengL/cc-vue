import { NodeTypes, createVNodeCall } from '../ast'

export function transformElement(node: any, context: any) {
    return ()=>{
        const vnodeTag = `${node.tag}`
        const vnodeProps = null
        let vnodeChildren = null
        if(node.children.length > 0){
            if(node.children.length === 1){
                //只有一个孩子节点，那么当生成render函数的时候不用[]包裹
                vnodeChildren = node.children[0]
            }
        }
        //创建一个node用于codegen时使用
        node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren)
    }
}