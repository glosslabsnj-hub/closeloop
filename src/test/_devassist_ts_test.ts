// Temporary file for Dev Assistant TypeScript error detection test
// This file contains intentional TypeScript errors for testing

// TS2322: Type 'string' is not assignable to type 'number'
const myNumber: number = "this is not a number";

// TS2304: Cannot find name 'nonExistentFunction'
const result = nonExistentFunction();

// TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
function addNumbers(a: number, b: number): number {
  return a + b;
}
addNumbers("hello", "world");

export {};
