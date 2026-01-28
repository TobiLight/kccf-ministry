import { BasePage } from "./layout";

export function LoginPage() {
    return (
        <BasePage title="Login - KCCF Ministry">
            <div
                class="min-h-screen flex flex-col items-center justify-center m-auto h-full"
                data-signals="{email: '', password: '', isLoading: false}"
            >
                <div class="card w-full sm:w-auto sm:max-w-sm sm:shadow-xl h-full rounded-none">
                    <div class="card-body h-full justify-between">
                        <div className="grid">

                            <div class="fw-full flex flex-col gap-8 items-center justify-center mb-5">
                                <img src="/static/images/logo.png" alt="KCCF Logo" class="w-20 h-auto object-contain animate-fade-in" />
                                <h2 class="font-semibold">Kingdom Covenant</h2>

                            </div>
                            <h2 class="card-title justify-center text-md font-bold mb-6 text-primary">Login</h2>

                            <div className="flex flex-col gap-y-6">
                                <div class="form-control w-full">
                                    <label class="label">
                                        <span class="label-text">Email Address</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        class="input input-bordered w-full"
                                        data-model="email"
                                    />
                                </div>

                                <div class="form-control w-full">
                                    <label class="label">
                                        <span class="label-text">Password</span>
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        class="input input-bordered w-full"
                                        data-model="password"
                                    />

                                </div>



                                <div class="card-actions justify-end mt-4">
                                    <button
                                        class="btn btn-primary w-full"
                                        data-class-btn-disabled="$isLoading"
                                        data-attr-disabled="$isLoading"
                                        data-on-click="@post('/login')"
                                    >
                                        <span class="loading loading-spinner" data-show="$isLoading"></span>
                                        Sign In
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <label class="label">
                                        <a href="/forgot-password" class="label-text-alt link link-hover text-primary">Forgot password?</a>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="text-center text-sm">
                            Don't have an account? <a href="/signup" class="link link-primary">Sign up</a>
                        </div>

                    </div>
                </div>
            </div>
        </BasePage>
    );
}
