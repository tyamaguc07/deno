/*!
   Copyright 2018 Propel http://propel.site/.  All rights reserved.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// Do not add imports in this file in order to be compatible with Node.

export function assertEqual(actual: unknown, expected: unknown, msg?: string) {
  if (!equal(actual, expected)) {
    let actualString: string;
    let expectedString: string;
    try {
      actualString = String(actual);
    } catch (e) {
      actualString = "[Cannot display]";
    }
    try {
      expectedString = String(expected);
    } catch (e) {
      expectedString = "[Cannot display]";
    }
    console.error(
      "assertEqual failed. actual =",
      actualString,
      "expected =",
      expectedString
    );
    if (!msg) {
      msg = `actual: ${actualString} expected: ${expectedString}`;
    }
    throw new Error(msg);
  }
}

export function assert(expr: boolean, msg = "") {
  if (!expr) {
    throw new Error(msg);
  }
}

// TODO(ry) Use unknown here for parameters types.
// tslint:disable-next-line:no-any
export function equal(c: any, d: any): boolean {
  const seen = new Map();
  return (function compare(a, b) {
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
      }
      for (const key in { ...a, ...b }) {
        if (!compare(a[key], b[key])) {
          return false;
        }
      }
      seen.set(a, b);
      return true;
    }
    return false;
  })(c, d);
}

export type TestFunction = () => void | Promise<void>;

export interface TestDefinition {
  fn: TestFunction;
  name: string;
}

export const exitOnFail = true;

let filterRegExp: RegExp | null;
const tests: TestDefinition[] = [];

let filtered = 0;
const ignored = 0;
const measured = 0;

// Must be called before any test() that needs to be filtered.
export function setFilter(s: string): void {
  filterRegExp = new RegExp(s, "i");
}

export function test(t: TestDefinition | TestFunction): void {
  const fn: TestFunction = typeof t === "function" ? t : t.fn;
  const name: string = t.name;

  if (!name) {
    throw new Error("Test function may not be anonymous");
  }
  if (filter(name)) {
    tests.push({ fn, name });
  } else {
    filtered++;
  }
}

function filter(name: string): boolean {
  if (filterRegExp) {
    return filterRegExp.test(name);
  } else {
    return true;
  }
}

const RESET = "\x1b[0m";
const FG_RED = "\x1b[31m";
const FG_GREEN = "\x1b[32m";

function red_failed() {
  return FG_RED + "FAILED" + RESET;
}

function green_ok() {
  return FG_GREEN + "ok" + RESET;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log("running", tests.length, "tests");
  for (let i = 0; i < tests.length; i++) {
    const { fn, name } = tests[i];
    let result = green_ok();
    console.log("test", name);
    try {
      await fn();
      passed++;
    } catch (e) {
      result = red_failed();
      console.error((e && e.stack) || e);
      failed++;
      if (exitOnFail) {
        break;
      }
    }
    // TODO Do this on the same line as test name is printed.
    console.log("...", result);
  }

  // Attempting to match the output of Rust's test runner.
  const result = failed > 0 ? red_failed() : green_ok();
  console.log(
    `\ntest result: ${result}. ${passed} passed; ${failed} failed; ` +
      `${ignored} ignored; ${measured} measured; ${filtered} filtered out\n`
  );

  if (failed === 0) {
    // All good.
  } else {
    // Use setTimeout to avoid the error being ignored due to unhandled
    // promise rejections being swallowed.
    setTimeout(() => {
      throw new Error(`There were ${failed} test failures.`);
    }, 0);
  }
}

setTimeout(runTests, 0);
