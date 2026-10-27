import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";

const page = document.body.dataset.page || "home";
const rootPrefix = document.body.dataset.rootPrefix || (page === "home" ? "./" : "../");
const post = document.querySelector(".post-article");
const article = post ? {
  title: post.querySelector("h1").textContent,
  summary: post.querySelector(".post-summary").textContent,
  date: post.querySelector("time").dateTime,
  category: post.querySelector(".tag").textContent,
  language: post.lang,
  html: post.querySelector(".post-body").innerHTML,
} : null;

createRoot(document.querySelector("#react-root")).render(<App {...{ page, rootPrefix, article }}/>);
