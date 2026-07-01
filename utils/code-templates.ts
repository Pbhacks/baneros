export interface CodeTemplate {
  id: string;
  label: string;
  filename: string;
  content: string;
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    id: "html",
    label: "Landing Page",
    filename: "index.html",
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebOS Project</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="hero">
      <h1>Build something bold.</h1>
      <p>Edit this starter and ship your next idea.</p>
    </main>
  </body>
</html>
`,
  },
  {
    id: "react",
    label: "React Component",
    filename: "Widget.tsx",
    content: `type WidgetProps = {
  title: string;
};

export const Widget = ({ title }: WidgetProps) => {
  return (
    <section className="rounded-2xl border border-white/10 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">Start composing your interface here.</p>
    </section>
  );
};
`,
  },
  {
    id: "ts",
    label: "TypeScript Script",
    filename: "script.ts",
    content: `const greet = (name: string): string => {
  return \`Hello, \${name}.\`;
};

console.log(greet("WebOS"));
`,
  },
  {
    id: "python",
    label: "Python Starter",
    filename: "main.py",
    content: `def greet(name: str) -> str:
    return f"Hello, {name}."


if __name__ == "__main__":
    print(greet("WebOS"))
`,
  },
  {
    id: "cpp",
    label: "C++ Console App",
    filename: "main.cpp",
    content: `#include <iostream>
#include <string>

std::string greet(const std::string& name) {
  return "Hello, " + name + ".";
}

int main() {
  std::cout << greet("WebOS") << std::endl;
  return 0;
}
`,
  },
  {
    id: "java",
    label: "Java Starter",
    filename: "Main.java",
    content: `public class Main {
  private static String greet(String name) {
    return "Hello, " + name + ".";
  }

  public static void main(String[] args) {
    System.out.println(greet("WebOS"));
  }
}
`,
  },
  {
    id: "css",
    label: "Stylesheet",
    filename: "styles.css",
    content: `:root {
  --bg: #08101f;
  --panel: rgba(255, 255, 255, 0.08);
  --text: #f3f7ff;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at top, #16456a 0%, #08101f 65%);
  color: var(--text);
  font-family: "Space Grotesk", sans-serif;
}
`,
  },
  {
    id: "api",
    label: "API Route",
    filename: "route.ts",
    content: `export async function GET() {
  return Response.json({
    ok: true,
    message: "WebOS API route ready",
  });
}
`,
  },
];

export const getCodeTemplate = (id: string): CodeTemplate | undefined =>
  CODE_TEMPLATES.find((template) => template.id === id);
