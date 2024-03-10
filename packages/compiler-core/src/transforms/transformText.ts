import { NodeTypes } from "../ast";

import { isText } from "../utils";

export function transformText(node: any, context: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      //hi,{{msg}}时两个节点一个是text一个是Interpolation
      //生成的 render 函数应该为 "hi," + _toDisplayString(_ctx.msg)
      // 这里面就会涉及到添加一个 “+” 操作符
      // 检测下一个节点是不是 text 类型，如果是的话， 那么会创建一个 COMPOUND 类型
      // COMPOUND 类型把 2个 text || interpolation 包裹（相当于是父级容器）

      const children = node.children;
      let currentContainer;

      for(let i = 0; i < children.length; i++){
        const child = children[i];
        if(isText(child)){
            //看下一个节点是否为文本节点
            for(let j = i+1; j < children.length; j++){
                const next = children[j];
                if(isText(next)){
                    //currentContainer的目的就是为了把2个文本节点放在一个容器中
                    if(!currentContainer){
                        currentContainer = children[i] = {
                            type:NodeTypes.COMPOUND_EXPRESSION,
                            loc: child.loc,
                            children: [child]
                        }
                    }
                    currentContainer.children.push(` + `,next);
                    //吧当前节点放在容器内，然后删除j
                    children.splice(j,1);
                    j--;
                }else{
                    currentContainer = undefined;
                    break;
                }
            }
        }
      }
    };
  }
}
