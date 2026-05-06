package app

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

func projectSummaryLines(p Project) []string {
	if len(p.SummaryLines) > 0 {
		return p.SummaryLines
	}
	return []string{"No description."}
}

type lineKind string

const (
	lineSystem  lineKind = "system"
	lineCommand lineKind = "command"
	lineOutput  lineKind = "output"
	lineHint    lineKind = "hint"
	lineError   lineKind = "error"
)

type terminalLine struct {
	text string
	kind lineKind
}

type model struct {
	width          int
	height         int
	input          string
	activeTab      int
	projectDetail  string
	lines          []terminalLine
	commandHistory []string
	historyIndex   int
}

var tabs = []string{"Whoami", "Education", "Experience", "Projects", "Contact"}

func NewModel() model {
	lines := make([]terminalLine, 0, 24)
	for _, row := range data.ASCIIHeader {
		lines = append(lines, terminalLine{text: row, kind: lineSystem})
	}
	lines = append(lines,
		terminalLine{text: "", kind: lineSystem},
		terminalLine{text: "Welcome. Use left/right (or h/l) to switch tabs.", kind: lineSystem},
		terminalLine{text: "Tip: 'help' is an alias for 'menu'.", kind: lineHint},
	)

	return model{
		activeTab:    0,
		lines:        lines,
		historyIndex: -1,
	}
}

func (m model) Init() tea.Cmd { return nil }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC:
			return m, tea.Quit
		case tea.KeyEnter:
			m.submitInput()
			return m, nil
		case tea.KeyBackspace, tea.KeyDelete:
			if len(m.input) > 0 {
				m.input = m.input[:len(m.input)-1]
			}
			return m, nil
		case tea.KeyLeft:
			m.activeTab = (m.activeTab - 1 + len(tabs)) % len(tabs)
			m.projectDetail = ""
			return m, nil
		case tea.KeyRight:
			m.activeTab = (m.activeTab + 1) % len(tabs)
			m.projectDetail = ""
			return m, nil
		case tea.KeyUp:
			m.historyUp()
			return m, nil
		case tea.KeyDown:
			m.historyDown()
			return m, nil
		case tea.KeyTab:
			m.autocomplete()
			return m, nil
		case tea.KeyEsc:
			m.projectDetail = ""
			return m, nil
		default:
			if msg.Type == tea.KeyRunes {
				typed := string(msg.Runes)
				switch typed {
				case "1", "2", "3", "4", "5":
					if strings.TrimSpace(m.input) == "" {
						m.activeTab = int(typed[0] - '1')
						m.projectDetail = ""
						return m, nil
					}
				}
				m.input += typed
			}
			return m, nil
		}
	}

	return m, nil
}

func (m model) View() string {
	if m.width == 0 || m.height == 0 {
		return tuiTheme.Root.Render("Loading...")
	}

	return tuiTheme.Root.Width(m.width).Render(m.renderStackedPanel(m.width))
}

func (m *model) submitInput() {
	raw := strings.TrimSpace(m.input)
	if raw == "" {
		return
	}

	m.lines = append(m.lines, terminalLine{text: raw, kind: lineCommand})
	m.commandHistory = append(m.commandHistory, raw)
	m.historyIndex = -1
	m.input = ""
	m.runCommand(raw)
}

func (m *model) runCommand(raw string) {
	command := strings.ToLower(strings.TrimSpace(raw))
	if command == "" {
		return
	}

	switch command {
	case "menu", "help":
		m.emit(lineOutput, "Available commands:")
		m.emit(lineOutput, "- whoami, education, experience, projects, contact: switch tabs")
		m.emit(lineOutput, "- tab <name>: switch tabs by name")
		m.emit(lineOutput, "- open <project-id>: show project detail in Projects tab")
		m.emit(lineOutput, "- clear: clear terminal output")
		m.emit(lineOutput, "- quit/exit: close app")
		m.emit(lineOutput, "")
		m.emit(lineOutput, "Extras:")
		m.emit(lineOutput, "- resume: show resume link")
		m.emit(lineOutput, "- snake: coming soon")
	case "about", "whoami":
		m.switchToTab("whoami")
		m.emit(lineOutput, "Switched to Whoami tab.")
	case "tab whoami", "tab education", "tab experience", "tab projects", "tab contact":
		tabName := strings.TrimSpace(strings.TrimPrefix(command, "tab "))
		m.switchToTab(tabName)
		m.emit(lineOutput, fmt.Sprintf("Switched to %s tab.", tabs[m.activeTab]))
	case "projects":
		m.switchToTab("projects")
		m.emit(lineOutput, "Switched to Projects tab.")
	case "experience":
		m.switchToTab("experience")
		m.emit(lineOutput, "Switched to Experience tab.")
	case "education":
		m.switchToTab("education")
		m.emit(lineOutput, "Switched to Education tab.")
	case "contact":
		m.switchToTab("contact")
		m.emit(lineOutput, "Switched to Contact tab.")
	case "resume":
		m.emit(lineOutput, "Resume: add your resume URL in contact data when ready.")
	case "snake":
		m.emit(lineHint, "Snake mode is planned. Command registered for future expansion.")
	case "clear":
		m.lines = nil
	case "quit", "exit":
		m.emit(lineHint, "Use Ctrl+C to quit.")
	default:
		if strings.HasPrefix(command, "open ") {
			projectID := strings.TrimSpace(strings.TrimPrefix(command, "open "))
			if projectID == "" {
				m.emit(lineError, "Usage: open <project-id>")
				return
			}
			if m.openProject(projectID) {
				return
			}
		}
		if strings.HasPrefix(command, "tab ") {
			tabName := strings.TrimSpace(strings.TrimPrefix(command, "tab "))
			if m.switchToTab(tabName) {
				m.emit(lineOutput, fmt.Sprintf("Switched to %s tab.", tabs[m.activeTab]))
				return
			}
		}

		m.emit(lineError, fmt.Sprintf("Command not found: %s", command))
		suggestion := m.suggestCommand(command)
		if suggestion != "" {
			m.emit(lineHint, fmt.Sprintf("Did you mean: %s?", suggestion))
		}
	}
}

func (m *model) openProject(id string) bool {
	for _, project := range data.Projects {
		if project.ID != id {
			continue
		}

		m.switchToTab("projects")
		m.projectDetail = project.ID
		m.emit(lineOutput, fmt.Sprintf("%s (%s)", project.Title, project.ID))
		for _, line := range projectSummaryLines(project) {
			m.emit(lineOutput, "• "+line)
		}
		m.emit(lineOutput, "Stack: "+strings.Join(project.Stack, ", "))
		return true
	}

	m.emit(lineError, fmt.Sprintf("No project found with id: %s", id))
	return false
}

func (m *model) emit(kind lineKind, text string) {
	m.lines = append(m.lines, terminalLine{text: text, kind: kind})
}

func (m *model) historyUp() {
	if len(m.commandHistory) == 0 {
		return
	}

	nextIndex := m.historyIndex
	if nextIndex == -1 {
		nextIndex = len(m.commandHistory) - 1
	} else {
		nextIndex = max(0, nextIndex-1)
	}

	m.historyIndex = nextIndex
	m.input = m.commandHistory[nextIndex]
}

func (m *model) historyDown() {
	if len(m.commandHistory) == 0 || m.historyIndex == -1 {
		return
	}

	nextIndex := m.historyIndex + 1
	if nextIndex >= len(m.commandHistory) {
		m.historyIndex = -1
		m.input = ""
		return
	}

	m.historyIndex = nextIndex
	m.input = m.commandHistory[nextIndex]
}

func (m *model) autocomplete() {
	query := strings.ToLower(strings.TrimSpace(m.input))
	if query == "" {
		return
	}

	commands := []string{"menu", "help", "whoami", "projects", "open", "experience", "education", "contact", "tab", "resume", "snake", "clear", "quit", "exit"}
	matches := make([]string, 0, len(commands))
	for _, name := range commands {
		if strings.HasPrefix(name, query) {
			matches = append(matches, name)
		}
	}

	if len(matches) == 1 {
		m.input = matches[0] + " "
		return
	}
	if len(matches) > 1 {
		m.emit(lineHint, "Suggestions: "+strings.Join(matches, ", "))
	}
}

func (m model) suggestCommand(input string) string {
	commands := []string{"menu", "help", "whoami", "projects", "open", "experience", "education", "contact", "tab", "resume", "snake", "clear", "quit"}
	for _, name := range commands {
		if strings.HasPrefix(name, input) {
			return name
		}
	}

	for _, name := range commands {
		if strings.Contains(name, input) || strings.Contains(input, name) {
			return name
		}
	}

	return ""
}

func (m model) renderTerminalPanel(width int) string {
	contentWidth := max(20, width-4)

	var sb strings.Builder
	sb.WriteString(tuiTheme.Header.Render("Portfolio Terminal"))
	sb.WriteString("\n\n")

	renderedLines := make([]string, 0, len(m.lines)+3)
	for _, line := range m.lines {
		renderedLines = append(renderedLines, m.renderLine(line))
	}

	maxLines := max(8, m.height-12)
	if len(renderedLines) > maxLines {
		renderedLines = renderedLines[len(renderedLines)-maxLines:]
	}

	sb.WriteString(strings.Join(renderedLines, "\n"))
	sb.WriteString("\n")
	sb.WriteString(m.renderPrompt() + " " + m.input)
	sb.WriteString("\n\n")
	sb.WriteString(tuiTheme.Muted.Render("Enter run | <-/-> tabs | 1-5 jump tabs | Tab autocomplete | Up/Down history"))

	return tuiTheme.Panel.Width(contentWidth).Render(sb.String())
}

func (m model) renderStackedPanel(width int) string {
	contentWidth := max(20, width-4)
	availableHeight := max(18, m.height-8)
	terminalSectionHeight := max(8, availableHeight/3)
	previewSectionHeight := max(8, availableHeight-terminalSectionHeight)

	var sb strings.Builder
	sb.WriteString(tuiTheme.Header.Render("Workspace"))
	sb.WriteString("\n")
	sb.WriteString(m.renderTabBar())
	sb.WriteString("\n\n")
	previewLines := strings.Split(m.previewBody(), "\n")
	previewContentLines := max(4, previewSectionHeight-4)
	if len(previewLines) > previewContentLines {
		previewLines = previewLines[:previewContentLines]
	}
	sb.WriteString(strings.Join(previewLines, "\n"))
	sb.WriteString("\n\n")
	sb.WriteString(tuiTheme.Muted.Render(strings.Repeat("─", max(24, contentWidth-2))))
	sb.WriteString("\n\n")
	sb.WriteString(tuiTheme.Header.Render("Terminal"))
	sb.WriteString("\n\n")

	renderedLines := make([]string, 0, len(m.lines)+3)
	for _, line := range m.lines {
		renderedLines = append(renderedLines, m.renderLine(line))
	}

	maxLines := max(4, terminalSectionHeight-6)
	if len(renderedLines) > maxLines {
		renderedLines = renderedLines[len(renderedLines)-maxLines:]
	}

	sb.WriteString(strings.Join(renderedLines, "\n"))
	sb.WriteString("\n")
	sb.WriteString(m.renderPrompt() + " " + m.input)
	sb.WriteString("\n\n")
	sb.WriteString(tuiTheme.Muted.Render("Enter run | <-/-> tabs | 1-5 jump tabs | Tab autocomplete | Up/Down history"))

	return tuiTheme.Panel.Width(contentWidth).Render(sb.String())
}

func (m model) renderPreviewPanel(width int) string {
	contentWidth := max(20, width-4)
	title := tuiTheme.Header.Render("Workspace")
	tabBar := m.renderTabBar()
	body := m.previewBody()
	return tuiTheme.Panel.Width(contentWidth).Render(title + "\n" + tabBar + "\n\n" + body)
}

func (m model) previewBody() string {
	switch tabs[m.activeTab] {
	case "Whoami":
		return strings.Join([]string{
			data.Preview.Name,
			data.Preview.Role,
			"",
			data.Preview.Tagline,
			"",
			"Try: projects | experience | education | contact",
		}, "\n")
	case "Education":
		return strings.Join(data.EducationLines, "\n")
	case "Experience":
		return strings.Join(data.ExperienceLines, "\n")
	case "Projects":
		if m.projectDetail != "" {
			for _, p := range data.Projects {
				if p.ID == m.projectDetail {
					lines := []string{p.Title, ""}
					for _, line := range projectSummaryLines(p) {
						lines = append(lines, "• "+line)
					}
					lines = append(lines, "", "Stack: "+strings.Join(p.Stack, ", "), "", "Press Esc to leave detail view.")
					return strings.Join(lines, "\n")
				}
			}
		}
		rows := []string{"Projects"}
		for _, p := range data.Projects {
			rows = append(rows, fmt.Sprintf("- %s: %s", p.ID, p.Title))
		}
		rows = append(rows, "", "Try: open <project-id>")
		return strings.Join(rows, "\n")
	case "Contact":
		rows := []string{"Contact"}
		for _, c := range data.Contacts {
			rows = append(rows, fmt.Sprintf("- %s: %s", c.Label, c.Value))
		}
		return strings.Join(rows, "\n")
	default:
		return "Preview unavailable for this mode."
	}
}

func (m *model) switchToTab(tabName string) bool {
	normalized := strings.ToLower(strings.TrimSpace(tabName))
	for i, name := range tabs {
		if strings.ToLower(name) == normalized {
			m.activeTab = i
			m.projectDetail = ""
			return true
		}
	}
	return false
}

func (m model) renderTabBar() string {
	rendered := make([]string, 0, len(tabs))
	for i, name := range tabs {
		label := fmt.Sprintf("%d:%s", i+1, name)
		if i == m.activeTab {
			rendered = append(rendered, tuiTheme.TabActive.Render(label))
			continue
		}
		rendered = append(rendered, tuiTheme.Tab.Render(label))
	}
	return strings.Join(rendered, " ")
}

func (m model) renderPrompt() string {
	user := tuiTheme.PromptUser.Render("explorer")
	host := tuiTheme.PromptHost.Render("@portfolio")
	symbol := tuiTheme.PromptSymbol.Render("$")
	return user + host + " " + symbol
}

func (m model) renderLine(line terminalLine) string {
	switch line.kind {
	case lineCommand:
		return tuiTheme.CommandText.Render(m.renderPrompt() + " " + line.text)
	case lineError:
		return tuiTheme.ErrorText.Render(line.text)
	case lineHint:
		return tuiTheme.HintText.Render(line.text)
	case lineSystem:
		return tuiTheme.SystemText.Render(line.text)
	default:
		return tuiTheme.OutputText.Render(line.text)
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
