"use client";

type SelectProjectProps = {
  setView: React.Dispatch<React.SetStateAction<string>>;
};

export default function SelectProject({ setView }: SelectProjectProps) {
  return (
    <div className="flex items-center justify-center gap-10">

      <button 
        className="not-prose relative bg-white dark:bg-slate-800 flex justify-center items-center rounded-xl overflow-hidden w-80 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => setView("existing")}
      >
        <div style={{ backgroundPosition: '10px 10px' }} className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
          <div className="relative overflow-auto flex flex-col justify-center items-center h-80">
            <div className="my-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.8} stroke="#cbd5e1" className="h-20 w-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>

            <div className="border-slate-100 dark:border-slate-700 p-4 font-semibold text-slate-500 dark:text-slate-400 text-center text-lg">Load Project</div>
            <div className="border-slate-100 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-400 text-center text-sm">Load existing projects from files on server,<br/>or check video processing status.</div>
          </div>
        <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
      </button>


      <button 
        className="not-prose relative bg-white dark:bg-slate-800 flex justify-center items-center rounded-xl overflow-hidden w-80 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => setView("add")}
      >
        <div style={{ backgroundPosition: '10px 10px' }} className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
          <div className="relative overflow-auto flex flex-col justify-center items-center h-80">
            <div className="my-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.8} stroke="#cbd5e1" className="h-20 w-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="border-slate-100 dark:border-slate-700 p-4 font-semibold text-slate-500 dark:text-slate-400 text-center text-lg">Create New Project</div>
            <div className="border-slate-100 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-400 text-center text-sm">Create new project from raw video file.<br/>Extracting pose data may take some time.</div>
          </div>
        <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
      </button>
    </div>
  );
}
