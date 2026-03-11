"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, SparkIcon } from "./dashboard-ui";
import styles from "./page.module.css";
import { buildSpecialistAgentResponse, getSpecialistAgent } from "lib/ai-agent-orchestration";

export default function PageAgentPanel({
  agentId,
  dashboardData,
  context = {},
  wide = true,
}) {
  const router = useRouter();
  const agent = getSpecialistAgent(agentId);
  const [inputValue, setInputValue] = useState("");
  const [response, setResponse] = useState(null);

  function askAgent(question) {
    const trimmedQuestion = String(question || "").trim();
    if (!trimmedQuestion) {
      return;
    }

    setResponse(buildSpecialistAgentResponse(agentId, trimmedQuestion, dashboardData, context));
    setInputValue("");
  }

  return (
    <Card eyebrow="IA ESPECIALISTA" title={agent.panelTitle} wide={wide}>
      <div className={styles.pageAgentPanel}>
        <div className={styles.pageAgentHeader}>
          <div className={styles.pageAgentBadge}>
            <SparkIcon />
          </div>
          <div className={styles.pageAgentIntro}>
            <strong>{agent.name}</strong>
            <p>{agent.scope}</p>
          </div>
        </div>

        <div className={styles.pageAgentPromptRow}>
          {agent.prompts.map((prompt) => (
            <button key={prompt} type="button" className={styles.pageAgentPromptChip} onClick={() => askAgent(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        <div className={styles.pageAgentComposer}>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={agent.placeholder}
          />
          <div className={styles.pageAgentActions}>
            <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/ai-agent")}>
              Abrir NORA
            </button>
            <button type="button" className={styles.primaryActionButton} onClick={() => askAgent(inputValue)}>
              Perguntar
            </button>
          </div>
        </div>

        {response ? (
          <div className={styles.pageAgentResponse}>
            <span>Resposta especializada</span>
            <strong>{response.agent.name}</strong>
            <p>{response.text}</p>
            {response.handoffToNora ? (
              <small>Esse tema toca outros dominios. A NORA pode cruzar mais de um agente especializado.</small>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function PageAgentToggleButton({ agentId, open = false, onToggle }) {
  const agent = getSpecialistAgent(agentId);

  return (
    <button
      type="button"
      className={`${styles.pageAgentToggleButton} ${open ? styles.pageAgentToggleButtonActive : ""}`.trim()}
      onClick={onToggle}
      aria-expanded={open}
    >
      <SparkIcon />
      <span>{agent.name}</span>
    </button>
  );
}
