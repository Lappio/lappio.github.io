import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import "./home.css";

const page = document.body.dataset.page || "home";
const rootPrefix = document.body.dataset.rootPrefix || (page === "home" ? "./" : "../");
const articleData = document.querySelector("#article-data");
const article = articleData ? JSON.parse(articleData.textContent) : null;

createRoot(document.querySelector("#react-root")).render(<App {...{ page, rootPrefix, article }}/>);
