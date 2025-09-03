import '@types/jest'

declare global {
  var describe: jest.Describe
  var it: jest.It
  var test: jest.It
  var beforeEach: jest.Lifecycle
  var afterEach: jest.Lifecycle
  var beforeAll: jest.Lifecycle
  var afterAll: jest.Lifecycle
}

export {}