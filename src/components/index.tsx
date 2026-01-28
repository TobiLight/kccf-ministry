import { BasePage } from "./layout";
export { SplashPage } from "./splash";
export { LoginPage } from "./login";

export function LandingPage() {
  return <div id="landingPage" style="display: contents">
    <div class="min-h-screen hero bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold text-primary">Church App</h1>
          <p class="py-6 text-base-content/80">
            Welcome to the new Church App boilerplate.
          </p>
          <button class="btn btn-primary">Get Started</button>
        </div>
      </div>
    </div>
  </div>;
}

export function IndexPage() {
  return (
    <BasePage title="Church App">
      <div id='init-sse' data-init='@get("/sse")'></div>
      {LandingPage()}
    </BasePage>
  );
}
