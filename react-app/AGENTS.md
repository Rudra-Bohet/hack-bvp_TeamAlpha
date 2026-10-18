<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep TanStack Start file routes as the React application entry points; the framework provides the supported routing and publishing runtime.
- Keep shared account, saved stock, and isolated guest-session behavior in StockProvider; inventory and spreadsheet import must read the same source of truth.
- Keep deterministic forecasting and spreadsheet mapping in browser-safe library modules, independent of visual presentation, so original behavior remains testable.
- Use AppHeader, PageHeading, semantic CSS tokens, and existing UI controls for presentation; a shared shell keeps all workspace pages visually consistent.
- Preserve the original static project on its GitHub branch and add the React application alongside it; this keeps the source reference available without modifying main.
