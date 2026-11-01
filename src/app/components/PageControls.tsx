import { Button } from './ui/button'
export function PageControls({offset,limit,total,onChange,disabled=false}: {offset:number;limit:number;total:number;onChange:(offset:number)=>void;disabled?:boolean}) {
  return <nav aria-label="Halaman hasil" className="mt-5 flex flex-wrap items-center justify-between gap-3">
    <span className="text-sm text-muted-foreground">{total ? `${offset+1}–${Math.min(offset+limit,total)} dari ${total}` : '0 hasil'}</span>
    <div className="flex gap-2"><Button variant="outline" disabled={disabled || offset===0} onClick={()=>onChange(Math.max(0,offset-limit))}>Sebelumnya</Button>
      <Button variant="outline" disabled={disabled || offset+limit>=total} onClick={()=>onChange(offset+limit)}>Berikutnya</Button></div>
  </nav>
}
