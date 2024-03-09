//ast生成代码
import {isString} from '@mini-vue/shared'

import { NodeTypes } from './ast'
import { CREATE_ELEMENT_VNODE,helperNameMap,TO_DISPLAY_STRING } from './runtimeHelpers'

export function generate(ast,options = {}){
    const context = createCodeGenContext(ast,options)
    const {push,mode} = context;

    //先生成preambleContext
    if(mode === 'module'){
        genModulePreamble(ast,context)
    }else{
        genFunctionPreamble(ast,context)
    }
    const functionName = "render"
    const args = ["_ctx"]
    //_ctx
    //需要把args 处理为上面的string
    push(`function ${functionName}($signature) {`)
    push('return')
    genNode(ast.codegenNode,context);
    push('}')
    return {
        code:context.code
    }
}

function genModulePreamble(ast:any,context:any){
    //preamble就是import语句
    const {push,newline,runtimeModuleName} = context;
    if(ast.helpers.length){
        //比如ast.helpers = [toDisplayString,createElementVNode]
        //那么生成之后就是imporyt {toDisplayString} from 'vue'
        const code = `import {${ast.helpers.map((s)=>`${helperNameMap[s]} as _${helperNameMap[s]}`)
        .join(', ')}} from ${JSON.stringify(runtimeModuleName)}`;
        push(code)
    }
    newline()
    push('export')
}

function genFunctionPreamble(ast:any,context:any){
    const {runtimeGlobalName,push,newline}  = context;
    const VueBinging = runtimeGlobalName;
    const aliasHelper = s => `${helperNameMap[s]} : _${helperNameMap[s]}`
    if(ast.helpers.length){
        push(
            `
            const { ${ast.helpers.map(aliasHelper).join(', ')}} = ${VueBinging}
            `
        )
    }
    newline()
    push('return')
}

function genNode(node:any,context:any){
    //这个函数的作用是生成ast的节点
    switch(node.type){
        case NodeTypes.INTERPOLATION:
            genInterpolation(node,context);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node,context);
            break;
        case NodeTypes.ELEMENT:
            genElement(node,context);
            break;
        case NodeTypes.TEXT:
            genText(node,context);
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node,context);
            break;
        default:
            break;
    }
}
function genInterpolation(node:any,context:any){
    const {push,helper} = context;
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content,context)
    push(')')
}
function genExpression(node:any,context:any){
    context.push(node.content)//直接输出表达式内容
}
function genElement(node:any,context:any){
    const {push,helper} = context;
    const {tag,props,children} = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}`)
    genNodeList(genNullableArgs([tag,props,children]),context)
    push(')')
}
function genNodeList(nodes:any,context:any){
    const {push} = context;
    for(let i = 0; i < nodes.length; i ++){
        const node = nodes[i];

        if(isString(node)){
            push(`${node}`);
        }else{
            genNode(node,context);
        }
        if(i<nodes.length - 1){
            push(',')
        }
    }
}
function genNullableArgs(args:any){
    let i = args.length;
    //把末尾为null的元素去掉
    //后面可能会包含patchFlag，dynamicProps等编译优化的信息
    while(i--){
        if(args[i] == null) break;
    }
    //把为false的值都替换为null
    return args.slice(0,i+1).map(arg => arg || "null");
}
function genText(node:any,context:any){
    const {push} = context;
    push(`'${node.content}'`)
}
function genCompoundExpression(node:any,context:any){
    const {push} = context;
    for(let i = 0; i < node.children.length; i++){
        const child = node.children[i];
        if(isString(child)){
            push(child)
        }else{
            genNode(child,context)
        }
    }
}

function createCodeGenContext(ast:any,{runtimeModuleName = 'vue',runtimeGlobalName = 'vue',mode = 'function'}){
    const context = {
        code:'',
        mode,
        runtimeModuleName,
        runtimeGlobalName,
        helper(key){
            return `${helperNameMap[key]}`
        },
        push(code){
            context.code +=code
        },
        newline(){
            context.code += '\n'
        }
    }
    return context
}