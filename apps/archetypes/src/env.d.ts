/// <reference types="astro/client" />

// WebMCP declarative tool attributes on forms (https://github.com/webmachinelearning/webmcp).
declare namespace astroHTML.JSX {
  interface FormHTMLAttributes {
    toolname?: string;
    tooldescription?: string;
  }
}
