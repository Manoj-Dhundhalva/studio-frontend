import { memo } from "react";
import styles from "./Logo.module.scss";

function Logo() {
  return <span className={styles["logo"]}>Canva</span>;
}

export default memo(Logo);
