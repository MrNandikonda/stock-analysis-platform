import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DeskPage from "@/pages/DeskPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeskPage />
    </QueryClientProvider>
  );
}
