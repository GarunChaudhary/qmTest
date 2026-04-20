<header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
  <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center gap-3">

    {/* ── BACK BUTTON ── */}
    <button
      onClick={() => router.push("/dashboard/Management_combined_page?tab=roles")}
      className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200
                 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
    >
      <ChevronLeft className="w-3.5 h-3.5" />
    </button>

    {/* ── BREADCRUMB ── */}
    <nav className="flex items-center gap-1.5 text-xs flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-gray-400">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1a76d1" }} />
        <span className="text-gray-500 text-[11.5px]">Role Privileges</span>
      </div>

      {roleName && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <span
            className="text-[11.5px] font-medium px-2 py-0.5 rounded-full border truncate max-w-[180px]"
            style={{ background: "#EFF6FF", color: "#1a76d1", borderColor: "#BFDBFE" }}
          >
            {roleName}
          </span>
        </>
      )}
    </nav>

    {/* ── ACTIONS ── */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* CLEAR */}
      <button
        onClick={() => { setSelectedModules({}); setModulePrivileges({}); }}
        className="h-[30px] px-3 text-[11.5px] font-semibold text-gray-500 bg-white
                   border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300
                   transition-all flex items-center gap-1.5"
      >
        <X className="w-3 h-3" />
        Clear
      </button>

      {/* SAVE */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="btn-primary flex items-center gap-1.5"
      >
        {saving
          ? <><span className="btn-spinner" />Saving…</>
          : <><Save className="w-3 h-3" />Save changes</>
        }
      </button>
    </div>

  </div>
</header>