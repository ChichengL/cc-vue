import { NodeTypes } from "./ast";3

export function isText(node){
    return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION; //插入{{}}和文本节点
}