import { generate } from "./codegen";
import { baseParse } from "./parser";
import { transform } from "./transforms";
import { transformExpression } from "./transforms/transformExpression";
import { transformElement } from "./transforms/transformElement";
import { transformText } from "./transforms/transformText";


export function baseCompile(template:string,options){
    const ast = baseParse(template) //创建ast语法树
    transform( //特殊处理ast语法树
        ast,
        Object.assign(options,{
            nodeTransforms:[transformExpression,transformElement,transformText]
        })
    )
    //生成render函数代码
    return generate(ast) //生成代码
}