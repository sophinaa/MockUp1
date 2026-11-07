import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the standalone prototype without installing a DOM or browser runtime.
// This verifies state transitions, not visual layout or browser accessibility.
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(
  /\}\)\(\);\s*$/,
  'globalThis.app = {S, ISLANDS, REVIEWS, explored, rank, syncBadges, startReview, beginIsland, submit, skip, sendAgent, go, render, matchesDemoRubric};})();'
);

function boot(store = new Map()) {
  const listeners = new Map(), timers = new Map();
  let timerId = 0, hash = '';
  const element = () => ({innerHTML:'', focus(){}, setAttribute(){}, showModal(){}, close(){}});
  const elements = Object.fromEntries(['top','main','toast','reset-dialog','widget','widget-footer','launcher'].map(id => [id, element()]));
  const context = {
    console,
    performance: {now:() => 0},
    matchMedia:() => ({matches:true}),
    localStorage: {getItem:key => store.get(key) || null, setItem:(key,value) => store.set(key,value)},
    document: {
      querySelector:selector => selector.startsWith('#') ? elements[selector.slice(1)] || null : null,
      getElementById:id => elements[id] || null,
      addEventListener:(name,fn) => listeners.set('document:'+name,fn),
    },
    location: {get hash(){return hash;}, set hash(value){const next = value.startsWith('#') ? value : '#'+value; if (hash !== next) {hash = next; listeners.get('hashchange')?.();}}},
    addEventListener:(name,fn) => listeners.set(name,fn),
    setTimeout:(fn,ms) => {const id = ++timerId; timers.set(id,{fn,ms}); return id;},
    clearTimeout:id => timers.delete(id),
    requestAnimationFrame:() => 1,
    cancelAnimationFrame(){},
    scrollTo(){},
  };
  vm.runInNewContext(source,context);
  const flush = () => {
    let guard = 0;
    while (timers.size && guard++ < 200) {
      const [id,{fn}] = [...timers].sort((a,b) => a[1].ms-b[1].ms)[0];
      timers.delete(id); fn();
    }
    assert.ok(guard < 200,'Timers must settle');
  };
  return {app:context.app,elements,flush,store,click:act => listeners.get('document:click')({target:{closest:() => ({dataset:{act}})}})};
}

const t = boot();
assert.equal(t.app.explored(),4);
assert.equal(t.app.rank().name,'Scout');
assert.equal(t.app.S.badges.length,0);
assert.match(t.elements.main.innerHTML,/A little fog rolled in/);
t.click('minimise');
assert.equal(t.app.S.open,false);
assert.equal(t.elements.widget.hidden,true);
t.click('toggle-widget');
assert.equal(t.app.S.open,true);
assert.equal(t.elements.widget.hidden,false);
for (const [key,review] of Object.entries(t.app.REVIEWS)) {
  review.questions.forEach((q,index) => {
    assert.equal(t.app.matchesDemoRubric(key,index,q.strong),true,`${key} ${index}: supplied explanation is accepted`);
    assert.equal(t.app.matchesDemoRubric(key,index,q.vague),false,`${key} ${index}: vague answer is rejected`);
  });
}
assert.equal(t.app.matchesDemoRubric('payments',0,'It is not charged twice because the check runs after the charge.'),false);

t.app.startReview('payments');
assert.match(t.elements.main.innerHTML,/Payments · 1 of 1/);
t.app.S.review.draft = 'An answer in progress';
t.click('minimise'); t.click('toggle-widget');
assert.equal(t.app.S.review.draft,'An answer in progress','Minimising preserves the answer draft');
t.app.submit('');
assert.equal(t.app.S.review.grading,false);
t.app.submit(t.app.REVIEWS.payments.questions[0].vague); t.flush();
assert.equal(t.app.S.disc.kind,'weak');
assert.equal(t.app.explored(),4);
assert.equal(t.app.S.badges.length,0,'Weak answers do not award badges');
t.click('retry');
t.app.submit(t.app.REVIEWS.payments.questions[0].strong); t.flush();
assert.equal(t.app.S.disc.kind,'bug');
assert.equal(t.app.S.badges.join(','),'bug-spotter');
assert.equal(t.app.S.disc.newBadges.join(','),'bug-spotter');
t.app.render();
assert.equal(t.app.S.badges.length,1,'Rerenders cannot duplicate rewards');
assert.equal(t.app.explored(),4,'Discovering the bug does not mark the unfixed module understood');

t.app.sendAgent();
t.app.go('world');
assert.equal(t.app.S.disc.agent,null,'Leaving an unfinished simulated fix allows it to be restarted');
t.app.beginIsland('payments');
t.app.sendAgent(); t.flush();
assert.equal(t.app.S.pay,'fixed');
t.app.startReview('paymentsFix');
t.app.submit(t.app.REVIEWS.paymentsFix.questions[0].strong); t.flush();
assert.equal(t.app.S.review.qi,1);
assert.equal(t.app.explored(),4);
t.app.submit(t.app.REVIEWS.paymentsFix.questions[1].strong); t.flush();
assert.equal(t.app.S.disc.kind,'understood');
assert.equal(t.app.S.pay,'done');
assert.equal(t.app.explored(),5);
assert.equal(t.app.S.badges.join(','),'bug-spotter,first-light');
assert.match(t.elements.main.innerHTML,/\+1 lantern lit/);
t.click('finish');
assert.equal(t.app.S.open,false,'Successful review can close the widget');
assert.equal(t.app.S.screen,'world');
t.click('toggle-widget');
assert.match(t.elements.main.innerHTML,/5|Notifications/);

const completedStore = new Map(t.store);
const reloaded = boot(t.store);
assert.equal(reloaded.app.explored(),5,'Completed understanding survives reload');
assert.equal(reloaded.app.S.pay,'done');
assert.equal(reloaded.app.S.badges.join(','),'bug-spotter,first-light','Badges survive reload');
reloaded.app.startReview('notify'); reloaded.app.skip();
assert.equal(reloaded.app.explored(),5,'Skipping does not clear fog');
assert.equal(reloaded.app.S.history[0].kind,'skipped');
assert.equal(reloaded.app.S.badges.length,2,'Skipping does not award a badge');
reloaded.click('confirm-reset');
assert.equal(reloaded.app.explored(),4);
assert.equal(reloaded.app.S.pay,'new');
assert.equal(reloaded.app.S.badges.length,0,'Reset clears the collection');

const bugReload = boot();
bugReload.app.startReview('payments');
bugReload.app.submit(bugReload.app.REVIEWS.payments.questions[0].strong); bugReload.flush();
const resumed = boot(bugReload.store);
resumed.app.beginIsland('payments'); resumed.app.skip();
assert.equal(resumed.app.S.pay,'skipped','A persisted finding can still be skipped');
assert.equal(resumed.app.explored(),4);

for (const key of ['notify','webhooks','config']) {
  const flow = boot(); flow.app.startReview(key);
  for (const q of flow.app.REVIEWS[key].questions) {flow.app.submit(q.strong); flow.flush();}
  assert.equal(flow.app.S.disc.kind,'understood',`${key} completes`);
  assert.equal(flow.app.explored(),5);
}
const journey = boot(completedStore);
for (const key of ['notify','webhooks','config']) {
  journey.app.startReview(key);
  for (const q of journey.app.REVIEWS[key].questions) {journey.app.submit(q.strong);journey.flush();}
  if(key==='notify') {
    assert.equal(journey.app.rank().name,'Pathfinder');
    assert.equal(journey.app.S.disc.levelUp,true);
  }
}
assert.equal(journey.app.explored(),8);
assert.equal(journey.app.rank().name,'Lightkeeper');
assert.equal(journey.app.S.badges.length,3);
assert.match(journey.elements.main.innerHTML,/Level up · Lightkeeper/);
journey.app.startReview('config');
journey.app.submit(journey.app.REVIEWS.config.questions[0].strong);journey.flush();
assert.equal(journey.app.S.badges.length,3,'Repeating a review cannot farm badges');
assert.equal(journey.app.S.disc.newArea,false);
assert.doesNotMatch(journey.elements.main.innerHTML,/\+1 lantern lit/);
const brokenStorage = {get(){throw new Error('Storage unavailable');},set(){throw new Error('Storage unavailable');}};
assert.equal(boot(brokenStorage).app.explored(),4);
assert.match(html,/<meta name="viewport"/);
assert.match(html,/<html lang="en">/);
console.log('PASS: popup flow, answer guide, badge unlocks, no duplicate rewards, rank progression, complete trail, persistence, skip/reset, interrupted agent, all modules, and unavailable storage.');
