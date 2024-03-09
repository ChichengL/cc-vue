import { extend } from "@mini-vue/shared";
import { ElementTypes, NodeTypes } from "./ast";
import { ad } from "vitest/dist/global-fe52f84b";

const enum TagType {
  Start,
  End,
}

export function baseParse(content) {
  //生成ast树
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}
function parseChildren(context: any, ancestors: any) {
  const nodes: any = [];
  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    if (startWith(s, "{{")) {
      //插值语法
      node = parseInterpolation(context, ancestors);
    } else if (s[0] === "<") {
      if (s[1] === "/") {
        //元素语法
        //处理借宿标签
        if (/[a-z]/i.test(s[1])) {
          // 匹配</div>
          parseTag(context, TagType.End);
          continue;
        }
      } else if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }
    if (!node) {
      //node，为文本节点
      node = parseText(context);
    }
    nodes.push(node);
  }
  return nodes;
}

function isEnd(context: any, ancestors) {
  //检测是否为结束标签，且如果没有匹配的开始标签也要结束
  const s = context.source;
  if (context.source.startWith("<")) {
    //从后门往前面查，因为便签存在的话，应该是ancestors的最后一个元素
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }
  return !context.source;
}

function parseElement(context, ancestors) {
  const element = parTag(context, TagType.Start);

  ancestors.push(element);
  const children = parseChildren(context, ancestors);
  ancestors.pop();

  //解析end tag是为了检测语法是不是正确的
  //检测是不是和start tag一致
  if (startWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`missing end tag for element <${element.tag}>`);
  }
  element.children = children;
  return element;
}
function startsWithEndTagOpen(source: string, tag: string) {
  //头部是否时</开头的
  // 看看是不是和tag一样
  return (
    startWith(source, "</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

function parseTag(context, type: TagType): any {
  //发现如果不是>,那么就吧字符都收集起来

  const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
  const tag = match[1];

  advanceBy(context, match[0].length); //移动光标<div

  //暂时不处理selfClose的情况，所以可以直接advanceBy 一个坐标< 的下一个就是>
  advanceBy(context, 1);
  if (type === TagType.End) return;
  let tagType = ElementTypes.ELEMENT;
  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType,
  };
}
function parseInterpolation(context: any) {
  //1.先获取到结束的index
  //2.通过closeIndex-startIndex获取到内容的长度，contextLength
  //通过slice截取内容

  //}}是插值的关闭
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );
  advanceBy(context, 2);
  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = context.source.slice(0, rawContentLength);

  const preTrimContent = parseTextData(context, rawContent.length);
  const content = preTrimContent.trim();
  //前进2
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function parseText(context): any {
  //解析文本内容
  const endTokens = ["<", "{{"];
  let endInex = context.source.length;

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endInex > index) {
      endInex = index;
    }
  }
  const content = parseTextData(context, endInex);
  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length: number): any {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}
function advanceBy(context: any, numberOfCharacters: number) {
    context.source = context.source.slice(numberOfCharacters);
}
