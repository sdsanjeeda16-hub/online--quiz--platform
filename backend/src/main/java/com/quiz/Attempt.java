package com.quiz;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
public class Attempt {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  public Long quizId;
  public String quizTitle;
  public Long studentId;
  public String studentName;
  public int score;
  public int total;
  @Column(length = 2000) public String answers;
  public LocalDateTime submittedAt;
}
