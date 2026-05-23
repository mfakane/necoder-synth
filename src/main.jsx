import React from "react";
import { createRoot } from "react-dom/client";
import Necoder from "../Necoder.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Necoder />
  </React.StrictMode>,
);
