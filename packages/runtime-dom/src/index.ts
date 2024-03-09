import { createApp } from "./index";
import { isOn } from "@mini-vue/shared";
import { createRenderer } from "@mini-vue/runtime-core";

function createElement(type) {
  const el = document.createElement(type);
  return el;
}

function createText(text) {
  return document.createTextNode(text);
}

function setText(node, text) {
  node.nodeValue = text;
}
function setElementText(el, text) {
  el.textContent = text;
}
function patchProp(el, key, preValue, nextValue) {
  if (isOn(key)) {
    // 事件处理函数
    /**
     * 1.添加的和删除的必须是一个函数
     * nextValue有可能时匿名函数，所以要判断一下
     */
    const invoKers = el._vei || (el._vei = {});
    const existingInvoker = invoKers[key];
    if (nextValue && existingInvoker) {
      existingInvoker.value = nextValue;
    } else {
      const eventName = key.slice(2).toLowerCase();
      if (nextValue) {
        const invoker = (invoKers[key] = nextValue);
        el.addEventListener(eventName, invoker);
      } else {
        el.removeEventListener(eventName, existingInvoker);
        invoKers[key] = undefined;
      }
    }
  } else {
    if (nextValue === null || nextValue === "") {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextValue);
    }
  }
}

function insert(child, parent, anchor = null) {
  parent.insertBefore(child, anchor);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}
let renderer;

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      createText,
      setText,
      setElementText,
      patchProp,
      insert,
      remove,
    }))
  );
}
export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

export * from "@mini-vue/runtime-core";
