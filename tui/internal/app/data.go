package app

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Project struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	SummaryLines []string `json:"summaryLines"`
	Stack        []string `json:"stack"`
}

type Contact struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type Preview struct {
	Name    string `json:"name"`
	Role    string `json:"role"`
	Tagline string `json:"tagline"`
}

type PortfolioData struct {
	ASCIIHeader     []string  `json:"asciiHeader"`
	AboutLines      []string  `json:"aboutLines"`
	Preview         Preview   `json:"preview"`
	Projects        []Project `json:"projects"`
	ExperienceLines []string  `json:"experienceLines"`
	EducationLines  []string  `json:"educationLines"`
	Contacts        []Contact `json:"contacts"`
}

var data = loadPortfolioData()

func loadPortfolioData() PortfolioData {
	defaultData := PortfolioData{
		ASCIIHeader: []string{
			"  ____             __  _____      ___      ",
			" / __ \\____  _____/ /_/ __(_)____/ (_)___ _",
			"/ /_/ / __ \\/ ___/ __/ /_/ / ___/ / / __ `/",
			"/ ____/ /_/ / /  / /_/ __/ / /  / / / /_/ / ",
			"/_/    \\____/_/   \\__/_/ /_/_/  /_/_/\\__,_/",
		},
		AboutLines: []string{
			"Hello, I'm Anand Bhat.",
			"I build terminal-inspired experiences with practical software engineering.",
			"Try: projects, experience, education, contact",
		},
		Preview: Preview{
			Name:    "Anand Bhat",
			Role:    "Computer Science Student @ GWU",
			Tagline: "Focused on systems, cybersecurity, and practical software engineering.",
		},
		Projects: []Project{
			{
				ID:      "portfolio",
				Title:   "Terminal Portfolio (CLI/TUI in progress)",
				SummaryLines: []string{
					"Keyboard-first terminal portfolio built with React, TypeScript, and Vite.",
					"Command routing, history, autocomplete, and a richer preview pane.",
					"Go CLI/TUI in progress—reuses the same exported JSON as the web app.",
					"Deployed web build is the stable baseline while the TUI catches up.",
				},
				Stack: []string{"React", "TypeScript", "Vite", "Go", "CSS"},
			},
			{
				ID:      "shell",
				Title:   "Mini Shell (msh)",
				SummaryLines: []string{
					"Minimal Unix shell written in C for GWU Systems Programming.",
					"Pipelines, fork/exec, redirection, and foreground/background jobs.",
					"Handles SIGINT, SIGTSTP, and SIGCHLD for sane Ctrl+C / Ctrl+Z behavior.",
					"Interactive input via Linenoise; focus on process control and pipes.",
				},
				Stack: []string{"C", "POSIX", "GNU Make", "Linenoise"},
			},
		},
		ExperienceLines: []string{
			"Research Fellow | The George Washington University | May 2026 - Present",
			"  Built security tools for detecting compromised drones.",
		},
		EducationLines: []string{
			"B.S. Computer Science | The George Washington University | Expected May 2027",
		},
		Contacts: []Contact{
			{Label: "Email", Value: "anvenbha1@gmail.com"},
			{Label: "GitHub", Value: "github.com/AnandB18"},
			{Label: "LinkedIn", Value: "linkedin.com/in/abhat21/"},
		},
	}

	paths := []string{
		os.Getenv("PORTFOLIO_DATA_PATH"),
		filepath.Join("..", "shared", "portfolio-data.json"),
		filepath.Join("shared", "portfolio-data.json"),
	}

	for _, path := range paths {
		if path == "" {
			continue
		}

		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		var parsed PortfolioData
		if err := json.Unmarshal(content, &parsed); err != nil {
			continue
		}

		if len(parsed.ASCIIHeader) == 0 || len(parsed.Projects) == 0 {
			continue
		}

		return parsed
	}

	return defaultData
}
