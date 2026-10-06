import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
async function api(path, method = "GET", body) {
  const r = await fetch(API + "/api" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  const d = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(d?.message || "Something went wrong");
  return d;
}
const fmt = s => String(Math.floor(Math.max(s, 0) / 60)).padStart(2, "0") + ":" + String(Math.max(s, 0) % 60).padStart(2, "0");

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [toast, setToast] = useState("");
  const login = u => { localStorage.setItem("user", JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.removeItem("user"); setUser(null); };
  const say = m => { setToast(m); setTimeout(() => setToast(""), 2800); };
  return (
    <>
      <div className="petals" aria-hidden>{[...Array(8)].map((_, i) => <i key={i} style={{ left: i * 13 + "%", animationDelay: -i * 2 + "s" }} />)}</div>
      {user && <header className="top"><b>🌸 Bloom Quiz</b><span>{user.name} ({user.role.toLowerCase()})</span><button className="ghost sm" onClick={logout}>Log out</button></header>}
      <main>{!user ? <Auth onLogin={login} say={say} /> : user.role === "FACULTY" ? <Faculty user={user} say={say} /> : <Student user={user} say={say} />}</main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function Auth({ onLogin, say }) {
  const [reg, setReg] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = async e => {
    e.preventDefault();
    try { onLogin(await api(reg ? "/register" : "/login", "POST", f)); } catch (x) { say(x.message); }
  };
  return (
    <form className="card auth pop" onSubmit={go}>
      <h1>{reg ? "Join the garden" : "Welcome back"}</h1>
      <p className="muted">Take and set quizzes, graded the moment you finish.</p>
      {reg && <div className="seg">{["STUDENT", "FACULTY"].map(r => <button type="button" key={r} className={f.role === r ? "on" : ""} onClick={() => setF({ ...f, role: r })}>{r === "STUDENT" ? "Student" : "Faculty"}</button>)}</div>}
      {reg && <input placeholder="Full name" value={f.name} onChange={set("name")} required />}
      <input type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
      <input type="password" placeholder="Password" value={f.password} onChange={set("password")} required />
      <button className="btn">{reg ? "Create account" : "Log in"}</button>
      <a onClick={() => setReg(!reg)}>{reg ? "I already have an account" : "New here? Create an account"}</a>
    </form>
  );
}

function Faculty({ user, say }) {
  const [quizzes, setQ] = useState([]);
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  const load = () => api("/quizzes").then(l => setQ(l.filter(x => x.facultyId === user.id))).catch(e => say(e.message));
  useEffect(() => { load(); }, []);
  const del = async q => {
    if (!confirm(`Delete "${q.title}" and its results?`)) return;
    try { await api("/quizzes/" + q.id, "DELETE"); say("Quiz deleted"); load(); } catch (e) { say(e.message); }
  };
  if (view === "new") return <Builder user={user} say={say} done={() => { setView("list"); load(); }} cancel={() => setView("list")} />;
  if (view === "results") return <Results quiz={sel} say={say} back={() => setView("list")} />;
  return (
    <div className="pop">
      <div className="bar"><h2>Your quizzes</h2><button className="btn" onClick={() => setView("new")}>New quiz</button></div>
      {!quizzes.length && <p className="card muted">No quizzes yet. Create one and students can start it right away.</p>}
      <div className="grid">{quizzes.map(q => (
        <div className="card" key={q.id}>
          <h3>{q.title}</h3><p className="muted">{q.topic || "General"}</p>
          <p><span className="chip">{q.questions} questions</span><span className="chip">{q.totalMarks} marks</span><span className="chip">{q.minutes} min</span></p>
          <div className="row"><button className="btn sm" onClick={() => { setSel(q); setView("results"); }}>Scores</button><button className="ghost sm" onClick={() => del(q)}>Delete</button></div>
        </div>
      ))}</div>
    </div>
  );
}

const blank = () => ({ text: "", options: ["", "", "", ""], correct: 0, marks: 1 });

function Builder({ user, done, cancel, say }) {
  const [q, setQ] = useState({ title: "", topic: "", minutes: 10, questions: [blank()] });
  const upd = (i, p) => setQ({ ...q, questions: q.questions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const opt = (i, k, v) => upd(i, { options: q.questions[i].options.map((o, j) => (j === k ? v : o)) });
  const save = async () => {
    if (!q.title.trim()) return say("Give the quiz a title");
    if (q.questions.some(x => !x.text.trim() || x.options.some(o => !o.trim()))) return say("Fill in every question and option");
    try { await api("/quizzes", "POST", { ...q, minutes: Math.max(1, +q.minutes || 1), facultyId: user.id }); say("Quiz published"); done(); } catch (e) { say(e.message); }
  };
  return (
    <div className="pop">
      <div className="bar"><h2>New quiz</h2><button className="ghost sm" onClick={cancel}>Cancel</button></div>
      <div className="card">
        <input placeholder="Quiz title" value={q.title} onChange={e => setQ({ ...q, title: e.target.value })} />
        <input placeholder="Topic (e.g. Data Structures)" value={q.topic} onChange={e => setQ({ ...q, topic: e.target.value })} />
        <label className="muted">Time limit (minutes)</label>
        <input type="number" min="1" value={q.minutes} onChange={e => setQ({ ...q, minutes: e.target.value })} />
      </div>
      {q.questions.map((x, i) => (
        <div className="card pop" key={i}>
          <div className="bar"><h3>Question {i + 1}</h3>{q.questions.length > 1 && <button className="ghost sm" onClick={() => setQ({ ...q, questions: q.questions.filter((_, j) => j !== i) })}>Remove</button>}</div>
          <input placeholder="Question text" value={x.text} onChange={e => upd(i, { text: e.target.value })} />
          <p className="muted">Select the radio button next to the correct option.</p>
          {x.options.map((o, k) => (
            <div className="row" key={k}>
              <input type="radio" name={"c" + i} checked={x.correct === k} onChange={() => upd(i, { correct: k })} />
              <input placeholder={"Option " + (k + 1)} value={o} onChange={e => opt(i, k, e.target.value)} />
            </div>
          ))}
          <label className="muted">Marks</label>
          <input type="number" min="1" value={x.marks} onChange={e => upd(i, { marks: Math.max(1, +e.target.value || 1) })} />
        </div>
      ))}
      <div className="row"><button className="ghost" onClick={() => setQ({ ...q, questions: [...q.questions, blank()] })}>Add question</button><button className="btn" onClick={save}>Publish quiz</button></div>
    </div>
  );
}

function Results({ quiz, back, say }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api(`/quizzes/${quiz.id}/results`).then(setRows).catch(e => say(e.message)); }, []);
  const avg = rows?.length ? Math.round(rows.reduce((a, r) => a + (r.score / r.total) * 100, 0) / rows.length) : 0;
  return (
    <div className="pop">
      <div className="bar"><h2>{quiz.title}</h2><button className="ghost sm" onClick={back}>Back</button></div>
      <p><span className="chip">{rows?.length || 0} attempts</span><span className="chip">Class average {avg}%</span></p>
      <div className="card wrap">
        {!rows?.length ? <p className="muted">No attempts yet. Scores show up here as soon as students submit.</p> : (
          <table><thead><tr><th>Student</th><th>Score</th><th>Percent</th><th>Submitted</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={r.id} style={{ animationDelay: i * 50 + "ms" }}><td>{r.studentName}</td><td>{r.score} / {r.total}</td><td>{Math.round((r.score / r.total) * 100)}%</td><td>{new Date(r.submittedAt).toLocaleString()}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

function Student({ user, say }) {
  const [quizzes, setQ] = useState([]);
  const [hist, setH] = useState([]);
  const [mode, setMode] = useState(null);
  const load = () => { api("/quizzes").then(setQ).catch(e => say(e.message)); api(`/students/${user.id}/attempts`).then(setH).catch(() => {}); };
  useEffect(() => { load(); }, []);
  const back = () => { setMode(null); load(); };
  if (mode?.t === "take") return <Take id={mode.id} user={user} say={say} back={back} onDone={d => setMode({ t: "review", d })} />;
  if (mode?.t === "review") return <Review data={mode.d} back={back} />;
  const open = async id => { try { setMode({ t: "review", d: await api("/attempts/" + id) }); } catch (e) { say(e.message); } };
  return (
    <div className="pop">
      <h2>Available quizzes</h2>
      {!quizzes.length && <p className="card muted">No quizzes are published yet. Check back soon.</p>}
      <div className="grid">{quizzes.map(q => (
        <div className="card" key={q.id}>
          <h3>{q.title}</h3><p className="muted">{q.topic || "General"}</p>
          <p><span className="chip">{q.questions} questions</span><span className="chip">{q.totalMarks} marks</span><span className="chip">{q.minutes} min</span></p>
          <button className="btn sm" onClick={() => setMode({ t: "take", id: q.id })}>Start quiz</button>
        </div>
      ))}</div>
      <h2 style={{ marginTop: 28 }}>My results</h2>
      {!hist.length && <p className="card muted">Your finished quizzes will appear here.</p>}
      <div className="grid">{hist.map(h => (
        <div className="card" key={h.id}>
          <h3>{h.quizTitle}</h3><p><span className="chip">{h.score} / {h.total}</span><span className="chip">{new Date(h.submittedAt).toLocaleDateString()}</span></p>
          <button className="ghost sm" onClick={() => open(h.id)}>Review answers</button>
        </div>
      ))}</div>
    </div>
  );
}

function Take({ id, user, onDone, back, say }) {
  const [quiz, setQuiz] = useState(null);
  const [ans, setAns] = useState([]);
  const [left, setLeft] = useState(0);
  const ansRef = useRef([]);
  const sent = useRef(false);
  ansRef.current = ans;
  useEffect(() => {
    api(`/quizzes/${id}/take`).then(q => { setQuiz(q); setAns(q.questions.map(() => -1)); setLeft(q.minutes * 60); }).catch(e => { say(e.message); back(); });
  }, []);
  useEffect(() => {
    if (!quiz) return;
    const t = setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [quiz]);
  const submit = async () => {
    if (sent.current) return;
    sent.current = true;
    try { onDone(await api(`/quizzes/${id}/submit`, "POST", { studentId: user.id, answers: ansRef.current })); } catch (e) { sent.current = false; say(e.message); }
  };
  useEffect(() => { if (quiz && left <= 0) { say("Time is up. Submitting your answers."); submit(); } }, [left, quiz]);
  if (!quiz) return <p className="muted">Loading quiz...</p>;
  const done = ans.filter(a => a >= 0).length;
  return (
    <div className="pop">
      <div className={"timer" + (left < 60 ? " low" : "")}>
        <div className="bar"><span>{quiz.title} ({done}/{quiz.questions.length} answered)</span><b>{fmt(left)}</b></div>
        <div className="track"><i style={{ width: (left / (quiz.minutes * 60)) * 100 + "%" }} /></div>
      </div>
      {quiz.questions.map((x, i) => (
        <div className="card" key={i}>
          <h3>{i + 1}. {x.text}<small>{x.marks} mark{x.marks > 1 ? "s" : ""}</small></h3>
          {x.options.map((o, k) => <div key={k} className={"opt" + (ans[i] === k ? " sel" : "")} onClick={() => setAns(ans.map((a, j) => (j === i ? k : a)))}>{o}</div>)}
        </div>
      ))}
      <div className="row"><button className="btn" onClick={() => confirm("Submit your answers now?") && submit()}>Submit quiz</button></div>
    </div>
  );
}

function Review({ data, back }) {
  const pct = Math.round((data.score / data.total) * 100);
  return (
    <div className="pop review">
      <button className="ghost sm" onClick={back}>Back to quizzes</button>
      <div className="card score"><div className="ring" style={{ "--p": pct }}><span>{pct}%</span></div><h2>{data.quizTitle}</h2><p className="muted">You scored {data.score} out of {data.total}</p></div>
      {data.questions.map((x, i) => (
        <div className="card" key={i}>
          <h3>{i + 1}. {x.text}<small>{x.marks} mark{x.marks > 1 ? "s" : ""}</small></h3>
          {x.options.map((o, k) => <div key={k} className={"opt " + (k === x.correct ? "right" : k === x.selected ? "wrong" : "")}>{o}{k === x.correct ? " (correct)" : k === x.selected ? " (your answer)" : ""}</div>)}
          {x.selected < 0 && <p className="muted">You did not answer this one.</p>}
        </div>
      ))}
    </div>
  );
}
