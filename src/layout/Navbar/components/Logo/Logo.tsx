import { memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Logo.module.scss";

function Logo() {
  const navigate = useNavigate();

  return (
    <span className={styles["logo"]} onClick={() => navigate("/")}>
      Canva
    </span>
  );
}

export default memo(Logo);
