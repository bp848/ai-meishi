import toast, { Toaster } from "react-hot-toast"

export function useToast() {
  return {
    toast,
    success: (message: string, description?: string) => {
      if (description) {
        toast.success(`${message}: ${description}`)
      } else {
        toast.success(message)
      }
    },
    error: (message: string, description?: string) => {
      if (description) {
        toast.error(`${message}: ${description}`)
      } else {
        toast.error(message)
      }
    },
    loading: (message: string) => toast.loading(message),
  }
}

export { Toaster }
