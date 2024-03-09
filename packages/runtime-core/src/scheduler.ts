const queue: any[] = [];
const activePreFlushCbs: any[] = [];

const p = Promise.resolve();
let isFlushing = false;

export function nextTick(cb?) {
  return cb ? p.then(cb) : p;
}
//负责将一个job（通常是一个回调函数）添加到全局的queue数组中。
//如果job尚未存在于队列中，则将其推入队列，并调用queueFlush()来启动任务处理流程
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush(); //执行所有的job
  }
}

function queueFlush() {
  //如果同时触发了两个组件的更新的话，会触发两次then这里是没必要的
  // 只需要在一次执行，完成所有的job
  // 所以需要判断是否触发了flushing
  if (isFlushing) return;
  isFlushing = true;
  nextTick(flushJobs);
}
//是专门用来处理预刷新任务的方法，它会将传入的回调函数cb添加到activePreFlushCbs数组中
export function queuePreFlushCb(cb) {
  queueCb(cb, activePreFlushCbs);
}
function queueCb(cb, activeQueue) {
  //直接添加到对应的列表
  //TODO:需要考虑activeQueue是否存在cb的情况
  //然后再执行flushJobs的时候就可以调用activeQueue了
  activeQueue.push(cb);

  //执行队列中所有的job
  queueFlush();
}

//是实际执行所有排队任务的地方。
//首先，它重置isFlushing为false，表明开始进入任务处理阶段。
//然后，先执行所有的预刷新任务（flushPreFlushCbs()），接着从queue队列中逐个取出并执行每个job
function flushJobs() {
  isFlushing = false;
  //先执行pre类型的job，这个job是在渲染之前的
  flushPreFlushCbs();

  let job;
  while ((job = queue.shift())) {
    if (job) {
      job();
    }
  }
}

function flushPreFlushCbs() {
  // 执行所有的job
  for (let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]();
  }
}

//执行逻辑
/**
 * 调用queueJob时，任务会被加入到任务队列中，并触发queueFlush方法
 * 如果此时没有正在进行的flushing操作，queueFlush会设置isFlushing为true，并利用nextTick把flushJobs安排到下个微任务中执行。
 *在flushJobs执行时，首先清空并同步执行所有预刷新任务，随后逐一处理常规任务队列queue中的任务。
 调用queuePreFlushCbs时，预刷新任务会被立即加入到activePreFlushCbs队列，并同时触发一次queueFlush，保证预刷新任务也能在合适的时机得到执行。
 */
