/**
 * Root-level 404 for paths outside any locale (an unsupported language prefix,
 * for example). It cannot use translations, since no locale is resolved here.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 opacity-70">
            <a href="/en" className="underline">
              Go to Food Finder
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
