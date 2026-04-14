// Pure local implementations — no server needed
// All functions return Promises for compatibility with existing async/await/.then() callers
import { startGame, getState, getPlayerWord, vote, resetGame, redeal } from './gameEngine'
import * as store from './wordStore'

function wrap(fn) {
  return (...args) => {
    try { return Promise.resolve(fn(...args)) }
    catch (e) { return Promise.reject(e) }
  }
}

// --- Game ---
export const apiStartGame = wrap(startGame)
export const apiGetState = wrap(getState)
export const apiGetPlayerWord = wrap(getPlayerWord)
export const apiVote = wrap(vote)
export const apiReset = wrap(resetGame)
export const apiRedeal = wrap(redeal)

// --- Categories ---
export const apiGetCategories = wrap(store.getCategories)
export const apiRenameCategory = wrap(store.renameCategory)
export const apiAddCategory = wrap(store.addCategory)
export const apiDeleteCategory = wrap(store.deleteCategory)

// --- Word pairs ---
export const apiGetWords = wrap(store.getWordPairs)
export const apiAddWord = wrap(store.addWordPair)
export const apiEditWord = wrap(store.editWordPair)
export const apiDeleteWord = wrap(store.deleteWordPair)
export const apiBatchImport = wrap(store.batchImport)
