import { expect,it,vi } from 'vitest'
import { renderHook,act,waitFor,cleanup } from '@testing-library/react'
import { useServerPage } from './hooks'
import type { BrowseParams,PageResult } from './api'
const state=vi.hoisted(()=>({user:{id:'user-a'}}))
vi.mock('./api',()=>({useCurrentUser:()=>state.user,useDb:vi.fn(),useMatches:vi.fn(),loadAnalysis:vi.fn(),loadDashboard:vi.fn(),fetchMatchesPage:vi.fn()}))
it('aborts the previous page and ignores a late response after filters change',async()=>{
  const pending:Array<{signal?:AbortSignal;resolve:(page:PageResult<string>)=>void}>=[]
  const loader=vi.fn((_q:BrowseParams,signal?:AbortSignal)=>new Promise<PageResult<string>>((resolve)=>pending.push({signal,resolve})))
  const {result,rerender,unmount}=renderHook(({q})=>useServerPage(loader,{q,offset:0,limit:12}),{initialProps:{q:'old'}})
  rerender({q:'new'})
  expect(pending[0].signal?.aborted).toBe(true)
  await act(async()=>pending[1].resolve({items:['new'],total:1000,offset:0,limit:12}))
  await waitFor(()=>expect(result.current.data?.items).toEqual(['new']))
  await act(async()=>pending[0].resolve({items:['old'],total:1000,offset:0,limit:12}))
  expect(result.current.data?.items).toEqual(['new'])
  expect(loader).toHaveBeenCalledTimes(2)
  unmount();expect(pending[1].signal?.aborted).toBe(true);cleanup()
})

it('clears the old user page and aborts its request when identity changes',async()=>{
  const pending:Array<{signal?:AbortSignal;resolve:(page:PageResult<string>)=>void}>=[]
  const loader=vi.fn((_q:BrowseParams,signal?:AbortSignal)=>new Promise<PageResult<string>>((resolve)=>pending.push({signal,resolve})))
  const {result,rerender,unmount}=renderHook(()=>useServerPage(loader,{offset:0,limit:12}))
  await act(async()=>pending[0].resolve({items:['account-a'],total:1,offset:0,limit:12}))
  expect(result.current.data?.items).toEqual(['account-a'])
  state.user={id:'user-b'};rerender()
  expect(result.current.data).toBeNull();expect(pending[0].signal?.aborted).toBe(true)
  await act(async()=>pending[1].resolve({items:['account-b'],total:1,offset:0,limit:12}))
  expect(result.current.data?.items).toEqual(['account-b'])
  unmount();state.user={id:'user-a'};cleanup()
})
