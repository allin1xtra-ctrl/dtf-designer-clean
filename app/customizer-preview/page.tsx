import CustomizerProductionShell from "@/components/customizer-preview/CustomizerProductionShell";

export const metadata = {
  title: "Custom Design Studio Preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomizerPreviewPage() {
  return <CustomizerProductionShell />;
}
