import {describe,it,expect,vi} from 'vitest';
import {attachTigerPlayer} from '@/lib/tiger-player';
import {emptyTigerProgress,type TigerPolicy} from '@/lib/tiger-progression';

describe('Native Tiger evidence save recovery',()=>{
 it('reports failed flushes to the caller, retries later saves, and restores the preceding connector',async()=>{
  const previous={register:vi.fn()},status=vi.fn();
  const host={ispringPresentationConnector:previous,setInterval:vi.fn(()=>1),clearInterval:vi.fn()} as unknown as Window;
  const frame={style:{visibility:''}} as unknown as HTMLIFrameElement;
  const initial=emptyTigerProgress();
  const save=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(initial);
  const adapter=attachTigerPlayer({host,frame,policy:{duration:100} as TigerPolicy,initial,save,status,adapterReady:vi.fn()});
  await expect(adapter.flush()).rejects.toThrow('offline');
  expect(status).toHaveBeenCalledWith(expect.stringContaining('could not be saved'));
  await expect(adapter.flush()).resolves.toEqual(initial);
  expect(save).toHaveBeenCalledTimes(2);
  adapter.dispose();
  expect((host as unknown as {ispringPresentationConnector:unknown}).ispringPresentationConnector).toBe(previous);
  await adapter.flush();
  expect(save).toHaveBeenCalledTimes(2);
 });
});
