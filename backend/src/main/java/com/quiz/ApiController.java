package com.quiz;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api") @CrossOrigin(origins = "*") @Transactional
public class ApiController {
  @PersistenceContext EntityManager em;

  static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
  static Map<String, Object> user(AppUser u) { return Map.of("id", u.id, "name", u.name, "email", u.email, "role", u.role); }

  Quiz find(Long id) {
    Quiz q = em.find(Quiz.class, id);
    if (q == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found");
    return q;
  }

  Map<String, Object> summary(Quiz q) {
    int total = q.questions.stream().mapToInt(x -> x.marks).sum();
    return Map.of("id", q.id, "title", q.title, "topic", q.topic == null ? "" : q.topic, "minutes", q.minutes,
        "questions", q.questions.size(), "totalMarks", total, "facultyId", q.facultyId == null ? 0 : q.facultyId);
  }

  Map<String, Object> review(Attempt t) {
    Quiz q = find(t.quizId);
    String[] a = t.answers.split(",");
    List<Map<String, Object>> qs = new ArrayList<>();
    for (int i = 0; i < q.questions.size(); i++) {
      Question x = q.questions.get(i);
      qs.add(Map.of("text", x.text, "options", new ArrayList<>(x.options), "correct", x.correct,
          "selected", Integer.parseInt(a[i]), "marks", x.marks));
    }
    return Map.of("id", t.id, "quizTitle", q.title, "score", t.score, "total", t.total, "questions", qs);
  }

  @PostMapping("/register")
  public Map<String, Object> register(@RequestBody AppUser in) {
    if (in.name == null || in.email == null || in.password == null || in.name.isBlank() || in.password.isBlank())
      throw bad("Please fill in all fields");
    in.email = in.email.trim().toLowerCase();
    if (!em.createQuery("select u from AppUser u where u.email = ?1").setParameter(1, in.email).getResultList().isEmpty())
      throw bad("This email is already registered");
    in.id = null;
    in.role = "FACULTY".equals(in.role) ? "FACULTY" : "STUDENT";
    em.persist(in);
    return user(in);
  }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody Map<String, String> b) {
    List<AppUser> l = em.createQuery("select u from AppUser u where u.email = ?1 and u.password = ?2", AppUser.class)
        .setParameter(1, String.valueOf(b.get("email")).trim().toLowerCase())
        .setParameter(2, String.valueOf(b.get("password"))).getResultList();
    if (l.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password");
    return user(l.get(0));
  }

  @GetMapping("/quizzes")
  public List<Map<String, Object>> quizzes() {
    List<Map<String, Object>> out = new ArrayList<>();
    for (Quiz q : em.createQuery("select q from Quiz q order by q.id desc", Quiz.class).getResultList()) out.add(summary(q));
    return out;
  }

  @PostMapping("/quizzes")
  public Map<String, Object> create(@RequestBody Quiz q) {
    if (q.title == null || q.title.isBlank() || q.questions == null || q.questions.isEmpty())
      throw bad("Add a title and at least one question");
    if (q.minutes < 1) q.minutes = 1;
    q.id = null;
    q.questions.forEach(x -> x.id = null);
    em.persist(q);
    return summary(q);
  }

  @DeleteMapping("/quizzes/{id}")
  public void delete(@PathVariable Long id) {
    em.createQuery("delete from Attempt t where t.quizId = ?1").setParameter(1, id).executeUpdate();
    em.remove(find(id));
  }

  @GetMapping("/quizzes/{id}/take")
  public Map<String, Object> take(@PathVariable Long id) {
    Quiz q = find(id);
    List<Map<String, Object>> qs = new ArrayList<>();
    for (Question x : q.questions) qs.add(Map.of("text", x.text, "options", new ArrayList<>(x.options), "marks", x.marks));
    return Map.of("id", q.id, "title", q.title, "minutes", q.minutes, "questions", qs);
  }

  @PostMapping("/quizzes/{id}/submit")
  public Map<String, Object> submit(@PathVariable Long id, @RequestBody Map<String, Object> b) {
    Quiz q = find(id);
    AppUser s = em.find(AppUser.class, ((Number) b.get("studentId")).longValue());
    List<?> ans = (List<?>) b.get("answers");
    int score = 0, total = 0;
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q.questions.size(); i++) {
      Question x = q.questions.get(i);
      total += x.marks;
      int a = i < ans.size() && ans.get(i) != null ? ((Number) ans.get(i)).intValue() : -1;
      if (a == x.correct) score += x.marks;
      sb.append(i > 0 ? "," : "").append(a);
    }
    Attempt t = new Attempt();
    t.quizId = id; t.quizTitle = q.title; t.studentId = s.id; t.studentName = s.name;
    t.score = score; t.total = total; t.answers = sb.toString(); t.submittedAt = LocalDateTime.now();
    em.persist(t);
    return review(t);
  }

  @GetMapping("/quizzes/{id}/results")
  public List<Attempt> results(@PathVariable Long id) {
    return em.createQuery("select t from Attempt t where t.quizId = ?1 order by t.score desc, t.submittedAt", Attempt.class)
        .setParameter(1, id).getResultList();
  }

  @GetMapping("/students/{id}/attempts")
  public List<Attempt> mine(@PathVariable Long id) {
    return em.createQuery("select t from Attempt t where t.studentId = ?1 order by t.id desc", Attempt.class)
        .setParameter(1, id).getResultList();
  }

  @GetMapping("/attempts/{id}")
  public Map<String, Object> attempt(@PathVariable Long id) { return review(em.find(Attempt.class, id)); }
}
