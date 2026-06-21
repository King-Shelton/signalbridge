// Stub for next/navigation — returns safe no-op values in preview environments
export const usePathname = () => '/';
export const useRouter = () => ({ push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} });
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const redirect = () => {};
export const notFound = () => {};
