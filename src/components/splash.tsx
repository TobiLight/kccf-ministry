import { BasePage } from "./layout";

export function SplashPage() {
    return (
        <BasePage title="KCCF Ministry">
            <div class="flex items-center justify-center min-h-screen bg-white" data-signals="{}">
                <div class="w-full flex flex-col gap-6 items-center justify-center">
                    <img
                        src="/static/images/logo.png"
                        // width={100}
                        // height={100}
                        alt="KCCF Ministry Logo"
                        class="w-16 h-16 object-contain animate-fade-in"
                    />
                    <h2 class="text-2xl font-bold">Kingdom Covenant</h2>
                </div>
                <script dangerouslySetInnerHTML={{
                    __html: `
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        `}} />
            </div>
            <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
        </BasePage>
    );
}
