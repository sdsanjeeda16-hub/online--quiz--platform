package com.quiz;
import jakarta.persistence.*;
import java.util.*;
@Entity
public class Quiz {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  public String title;
  public String topic;
  @Column(name = "time_limit") public int minutes = 10;
  public Long facultyId;
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true) @JoinColumn(name = "quiz_id") @OrderColumn(name = "pos")
  public List<Question> questions = new ArrayList<>();
}
